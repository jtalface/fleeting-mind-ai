import type { PredictionsListResult } from "@fleetmind/shared/contracts/predictions.js";
import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";
import type { AnalyticsEngineInput, AnalyticsService } from "./contracts.js";
import { rebuildDailyMart } from "./daily-mart.js";
import { listCachedPredictions } from "./list-predictions.js";
import { persistForecastEvaluations } from "./persist-forecast-evaluations.js";
import { persistPredictionBatches } from "./persist-predictions.js";
import { DEFAULT_SEGMENT_SCOPES, type SegmentPredictionScope } from "./prediction-scopes.js";
import { runBatchPredictions } from "./run-batch-predictions.js";

export interface RefreshCachedPredictionsOptions {
  horizonDays: number;
  segmentScopes?: SegmentPredictionScope[];
}

/** Rebuild mart, score fleet + segment forecasts, persist runs, return latest cache. */
export async function refreshCachedPredictions(
  input: AnalyticsEngineInput,
  analytics: AnalyticsService,
  repositories: TenantRepositorySet,
  options: RefreshCachedPredictionsOptions,
  generatedAt: string
): Promise<PredictionsListResult> {
  await rebuildDailyMart(input);
  const batches = await runBatchPredictions(input, analytics, {
    horizonDays: options.horizonDays,
    segmentScopes: options.segmentScopes ?? DEFAULT_SEGMENT_SCOPES
  });
  const allForecasts = batches.flatMap((batch) => batch.forecasts);
  await persistForecastEvaluations(repositories, allForecasts);
  await persistPredictionBatches(repositories, batches);

  return listCachedPredictions(input.tenantId, repositories, { horizonDays: options.horizonDays }, generatedAt);
}
