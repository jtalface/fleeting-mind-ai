import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { ForwardAccuracyEntry, ForwardAccuracyListResult } from "@fleetmind/shared/contracts/predictions.js";
import type {
  PredictionRunStored,
  TenantRepositorySet
} from "../../database/src/repositories/contracts.js";
import { ChampionForecastEngine } from "./forecast/champion-engine.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import { buildDailyHistoryFromRepositories } from "./history.js";
import { historyFilterForRun, scopeHistoryCacheKeyForRun } from "./prediction-scope-filter.js";
import { metricValueFromHistoryPoint } from "./prediction-history.js";
import { upsertForecastEvaluation } from "./persist-forecast-evaluations.js";

const engine = new ChampionForecastEngine();

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

function actualsByDate(
  history: Awaited<ReturnType<typeof buildDailyHistoryFromRepositories>>,
  metricKey: DeterministicForecast["metricKey"]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const point of history) {
    map.set(point.date, metricValueFromHistoryPoint(point, metricKey));
  }
  return map;
}

export function scoreForwardAccuracyForRun(
  run: PredictionRunStored,
  actuals: Map<string, number>
): { mae: number; mapePct: number; withinBandPct: number; scoredDays: number } | null {
  const predicted: number[] = [];
  const actual: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];

  for (const point of run.points) {
    const day = point.date.slice(0, 10);
    if (day >= todayUtc()) {
      continue;
    }
    const actualValue = actuals.get(day);
    if (actualValue === undefined) {
      continue;
    }
    predicted.push(point.p50);
    actual.push(actualValue);
    lower.push(point.p10);
    upper.push(point.p90);
  }

  if (predicted.length === 0) {
    return null;
  }

  const quality = engine.evaluateQuality(predicted, actual, lower, upper);
  return { ...quality, scoredDays: predicted.length };
}

export async function scoreForwardAccuracyForRuns(
  repositories: TenantRepositorySet,
  input: AnalyticsEngineInput,
  runs: PredictionRunStored[]
): Promise<number> {
  if (!repositories.forecastEvaluations || runs.length === 0) {
    return 0;
  }

  const historyCache = new Map<string, Awaited<ReturnType<typeof buildDailyHistoryFromRepositories>>>();
  let scored = 0;

  for (const run of runs) {
    const cacheKey = scopeHistoryCacheKeyForRun(run);
    let history = historyCache.get(cacheKey);
    if (!history) {
      history = await buildDailyHistoryFromRepositories(input, 120, historyFilterForRun(run));
      historyCache.set(cacheKey, history);
    }

    const quality = scoreForwardAccuracyForRun(run, actualsByDate(history, run.metricKey));
    if (!quality) {
      continue;
    }

    await upsertForecastEvaluation(repositories, {
      tenantId: run.tenantId,
      scopeType: run.scopeType,
      scopeKey: run.scopeKey,
      metricKey: run.metricKey,
      algorithm: run.algorithm as ForecastEvaluationEntry["algorithm"],
      trainedUntil: run.trainedUntil,
      horizonDays: run.horizonDays,
      evaluationKind: "forward",
      runId: run.id,
      mae: quality.mae,
      mapePct: quality.mapePct,
      withinBandPct: quality.withinBandPct,
      sampleSize: quality.scoredDays
    });
    scored += 1;
  }

  return scored;
}

export async function listForwardAccuracy(
  tenantId: string,
  repositories: TenantRepositorySet,
  query: { limit?: number } = {}
): Promise<ForwardAccuracyListResult> {
  const repo = repositories.forecastEvaluations;
  if (!repo) {
    return { tenantId, entries: [] };
  }

  const rows = await repo.listRecent({
    limit: query.limit ?? 20,
    evaluationKind: "forward"
  });

  return {
    tenantId,
    entries: rows.map((row) => ({
      id: row.id,
      runId: row.runId ?? "",
      tenantId: row.tenantId,
      scopeType: row.scopeType,
      scopeKey: row.scopeKey,
      metricKey: row.metricKey as ForwardAccuracyEntry["metricKey"],
      algorithm: row.algorithm as ForwardAccuracyEntry["algorithm"],
      trainedUntil: row.trainedUntil,
      horizonDays: row.horizonDays,
      mae: row.mae,
      mapePct: row.mapePct,
      withinBandPct: row.withinBandPct,
      scoredDays: row.sampleSize,
      createdAt: row.createdAt
    }))
  };
}
