import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { PredictionBundle, PredictionHistoryPoint } from "@fleetmind/shared/contracts/predictions.js";
import type { AnalyticsDataPoint, AnalyticsEngineInput } from "./contracts.js";
import { buildDailyHistoryFromRepositories } from "./history.js";
import type { PredictionScopeDefinition } from "./prediction-scopes.js";

export function metricValueFromHistoryPoint(
  point: AnalyticsDataPoint,
  metricKey: DeterministicForecast["metricKey"]
): number {
  switch (metricKey) {
    case "revenue":
      return point.revenue;
    case "cost":
      return point.cost;
    case "profit":
      return point.revenue - point.cost;
    case "fuel_cost_per_km":
      return point.fuelCostPerKm;
    case "idle_ratio_pct":
      return point.idleRatioPct;
    case "utilization_pct":
      return point.utilizationPct;
  }
}

export function historyActualsFromSeries(
  history: AnalyticsDataPoint[],
  metricKey: DeterministicForecast["metricKey"],
  trainedUntil: string,
  maxDays = 14
): PredictionHistoryPoint[] {
  const trainedDay = trainedUntil.slice(0, 10);
  return history
    .filter((point) => point.date <= trainedDay)
    .slice(-maxDays)
    .map((point) => ({
      date: point.date,
      actual: metricValueFromHistoryPoint(point, metricKey)
    }));
}

export async function enrichPredictionBundles(
  input: AnalyticsEngineInput,
  bundles: PredictionBundle[],
  options: { historyMaxDays?: number } = {}
): Promise<PredictionBundle[]> {
  const maxDays = options.historyMaxDays ?? 14;
  const scopeHistory = new Map<string, AnalyticsDataPoint[]>();

  return Promise.all(
    bundles.map(async (bundle) => {
      const cacheKey = `${bundle.scopeType}:${bundle.scopeKey}:${bundle.nameIncludes ?? ""}`;
      let history = scopeHistory.get(cacheKey);
      if (!history) {
        const segmentFilter =
          bundle.scopeType === "segment" && bundle.nameIncludes
            ? { nameIncludes: bundle.nameIncludes }
            : undefined;
        history = await buildDailyHistoryFromRepositories(input, 90, segmentFilter);
        scopeHistory.set(cacheKey, history);
      }

      return {
        ...bundle,
        historyActuals: historyActualsFromSeries(history, bundle.metricKey, bundle.trainedUntil, maxDays)
      };
    })
  );
}

export function scopeFromBundle(bundle: PredictionBundle): PredictionScopeDefinition {
  return {
    scopeType: bundle.scopeType,
    scopeKey: bundle.scopeKey,
    ...(bundle.nameIncludes ? { nameIncludes: bundle.nameIncludes } : {})
  };
}
