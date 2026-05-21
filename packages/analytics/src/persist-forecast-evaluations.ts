import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type {
  ForecastEvaluationRecord,
  ForecastEvaluationStored,
  TenantRepositorySet
} from "../../database/src/repositories/contracts.js";
import {
  DEFAULT_HOLDOUT_DAYS,
  forecastWithAlgorithm,
  holdoutResidualQuantileOffsets
} from "./forecast/backtest.js";
import { ChampionForecastEngine } from "./forecast/champion-engine.js";
import { buildDailyHistoryFromRepositories } from "./history.js";
import { historyFilterForScope, scopeHistoryCacheKey } from "./prediction-scope-filter.js";
import { metricValueFromHistoryPoint } from "./prediction-history.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import type { ScopedForecastBatch } from "./run-batch-predictions.js";

const engine = new ChampionForecastEngine();

const nonNegativeMetrics = new Set<DeterministicForecast["metricKey"]>([
  "revenue",
  "cost",
  "profit",
  "fuel_cost_per_km",
  "idle_ratio_pct",
  "utilization_pct"
]);

function holdoutQuality(
  forecast: DeterministicForecast,
  history: Awaited<ReturnType<typeof buildDailyHistoryFromRepositories>>
): { mae: number; mapePct: number; withinBandPct: number } {
  const series = history.map((point) => metricValueFromHistoryPoint(point, forecast.metricKey));
  if (series.length < 2) {
    return {
      mae: 0,
      mapePct: forecast.explanation.backtestMapePct ?? 0,
      withinBandPct: 0
    };
  }

  const holdout = Math.min(DEFAULT_HOLDOUT_DAYS, Math.max(2, Math.floor(series.length / 4)));
  const train = series.slice(0, -holdout);
  const actual = series.slice(-holdout);
  const algorithm = forecast.explanation.algorithm;
  const predicted = forecastWithAlgorithm(algorithm, train, holdout);
  const { p10Offset, p90Offset } = holdoutResidualQuantileOffsets(series, algorithm);
  const clampLower = (metricKey: DeterministicForecast["metricKey"], value: number, lower: number): number =>
    nonNegativeMetrics.has(metricKey) ? Math.max(0, lower) : lower;

  const lower = predicted.map((value) => clampLower(forecast.metricKey, value, value + p10Offset));
  const upper = predicted.map((value, index) => {
    const p90 = value + p90Offset;
    return p90 < (lower[index] ?? p90) ? (lower[index] ?? p90) : p90;
  });

  return engine.evaluateQuality(predicted, actual, lower, upper);
}

export async function upsertForecastEvaluation(
  repositories: TenantRepositorySet,
  record: ForecastEvaluationRecord
): Promise<ForecastEvaluationStored | undefined> {
  if (!repositories.forecastEvaluations) {
    return undefined;
  }
  return repositories.forecastEvaluations.upsert(record);
}

export async function persistForecastEvaluations(
  repositories: TenantRepositorySet,
  batches: ScopedForecastBatch[],
  input?: AnalyticsEngineInput
): Promise<void> {
  if (!repositories.forecastEvaluations) {
    return;
  }

  const scopeHistory = new Map<string, Awaited<ReturnType<typeof buildDailyHistoryFromRepositories>>>();

  for (const batch of batches) {
    const cacheKey = scopeHistoryCacheKey(batch.scope);
    let history = scopeHistory.get(cacheKey);
    if (!history && input) {
      history = await buildDailyHistoryFromRepositories(input, 90, historyFilterForScope(batch.scope));
      scopeHistory.set(cacheKey, history);
    }

    for (const forecast of batch.forecasts) {
      const quality = history?.length
        ? holdoutQuality(forecast, history)
        : {
            mae: 0,
            mapePct: forecast.explanation.backtestMapePct ?? 0,
            withinBandPct: 0
          };

      await upsertForecastEvaluation(repositories, {
        tenantId: forecast.tenantId,
        scopeType: batch.scope.scopeType,
        scopeKey: batch.scope.scopeKey,
        metricKey: forecast.metricKey,
        algorithm: forecast.explanation.algorithm,
        trainedUntil: forecast.trainedUntil,
        horizonDays: forecast.horizonDays,
        evaluationKind: "holdout",
        mae: quality.mae,
        mapePct: quality.mapePct,
        withinBandPct: quality.withinBandPct,
        sampleSize: forecast.explanation.sampleSize
      });
    }
  }
}
