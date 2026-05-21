import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { AnalyticsEngineInput, AnalyticsService } from "./contracts.js";
import { buildDailyHistoryFromRepositories } from "./history.js";
import {
  allPredictionScopes,
  DEFAULT_SEGMENT_SCOPES,
  type PredictionScopeDefinition,
  type SegmentPredictionScope
} from "./prediction-scopes.js";

export interface ScopedForecastBatch {
  scope: PredictionScopeDefinition;
  forecasts: DeterministicForecast[];
}

export interface RunBatchPredictionsOptions {
  horizonDays: number;
  segmentScopes?: SegmentPredictionScope[];
}

export async function runBatchPredictions(
  input: AnalyticsEngineInput,
  analytics: AnalyticsService,
  options: RunBatchPredictionsOptions
): Promise<ScopedForecastBatch[]> {
  const scopes = allPredictionScopes(options.segmentScopes ?? DEFAULT_SEGMENT_SCOPES);

  return Promise.all(
    scopes.map(async (scope) => {
      const segmentFilter =
        scope.scopeType === "segment" && scope.nameIncludes
          ? { nameIncludes: scope.nameIncludes }
          : undefined;
      const history = await buildDailyHistoryFromRepositories(input, 90, segmentFilter);
      const forecasts = analytics.runForecasts(input, history, options.horizonDays);
      return { scope, forecasts };
    })
  );
}
