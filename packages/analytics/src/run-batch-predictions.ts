import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { AnalyticsEngineInput, AnalyticsService } from "./contracts.js";
import { buildDailyHistoryFromRepositories } from "./history.js";
import { historyFilterForScope } from "./prediction-scope-filter.js";
import {
  allPredictionScopes,
  type PredictionScopeDefinition,
  type SegmentPredictionScope
} from "./prediction-scopes.js";
import { topVehiclesByRevenue } from "./top-vehicles-by-revenue.js";

export interface ScopedForecastBatch {
  scope: PredictionScopeDefinition;
  forecasts: DeterministicForecast[];
}

export interface RunBatchPredictionsOptions {
  horizonDays: number;
  segmentScopes?: SegmentPredictionScope[];
  topVehicles?: number;
}

export async function runBatchPredictions(
  input: AnalyticsEngineInput,
  analytics: AnalyticsService,
  options: RunBatchPredictionsOptions
): Promise<ScopedForecastBatch[]> {
  const topVehicles =
    options.topVehicles !== undefined && options.topVehicles > 0
      ? await topVehiclesByRevenue(input, options.topVehicles)
      : [];

  const scopes = allPredictionScopes({
    segmentScopes: options.segmentScopes ?? [],
    topVehicles
  });

  return Promise.all(
    scopes.map(async (scope) => {
      const history = await buildDailyHistoryFromRepositories(input, 90, historyFilterForScope(scope));
      const forecasts = analytics.runForecasts(input, history, options.horizonDays);
      return { scope, forecasts };
    })
  );
}
