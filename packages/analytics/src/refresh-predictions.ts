import type { PredictionsListResult } from "@fleetmind/shared/contracts/predictions.js";
import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";
import type { AnalyticsEngineInput, AnalyticsService } from "./contracts.js";
import { rebuildDailyMart } from "./daily-mart.js";
import { listCachedPredictions } from "./list-predictions.js";
import { enrichPredictionBundles } from "./prediction-history.js";
import { persistForecastEvaluations } from "./persist-forecast-evaluations.js";
import { scoreForwardAccuracyForRuns } from "./forward-accuracy.js";
import { persistPredictionBatches } from "./persist-predictions.js";
import { resolveSegmentScopes, resolveTopVehicles } from "./prediction-config.js";
import type { SegmentPredictionScope } from "./prediction-scopes.js";
import { runBatchPredictions } from "./run-batch-predictions.js";

export interface RefreshCachedPredictionsOptions {
  horizonDays: number;
  segmentScopes?: SegmentPredictionScope[];
  topVehicles?: number;
}

/** Rebuild mart, score fleet + segment + vehicle forecasts, persist runs, return latest cache. */
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
    segmentScopes: resolveSegmentScopes(options.segmentScopes),
    topVehicles: resolveTopVehicles(options.topVehicles)
  });
  await persistForecastEvaluations(repositories, batches, input);
  await persistPredictionBatches(repositories, batches);

  const matureRuns = (await repositories.predictionRuns?.listMature({ horizonDays: options.horizonDays, limit: 50 })) ?? [];
  await scoreForwardAccuracyForRuns(repositories, input, matureRuns);

  const result = await listCachedPredictions(
    input.tenantId,
    repositories,
    { horizonDays: options.horizonDays },
    generatedAt
  );
  result.bundles = await enrichPredictionBundles(input, result.bundles);
  return result;
}
