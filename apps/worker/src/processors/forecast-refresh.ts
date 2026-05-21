import type { Job } from "bullmq";
import type { AnalyticsEngineInput } from "@fleetmind/analytics/contracts.js";
import { forecastRefreshJobPayloadSchema } from "@fleetmind/shared/contracts/jobs.js";
import type { IdempotencyGuard } from "../idempotency.js";
import type { WorkerRuntime } from "../runtime/types.js";
import { resolveForecastWindow } from "../window-resolution.js";

export async function processForecastRefresh(
  job: Job,
  runtime: WorkerRuntime,
  idempotency: IdempotencyGuard
): Promise<{ skipped: boolean }> {
  const payload = forecastRefreshJobPayloadSchema.parse(job.data);

  if (payload.idempotencyKey) {
    const key = `${payload.tenantId}:${payload.idempotencyKey}`;
    const acquired = await idempotency.tryAcquire(key);
    if (!acquired) {
      return { skipped: true };
    }
  }

  const ts = typeof job.timestamp === "number" ? job.timestamp : Date.now();
  const resolved = resolveForecastWindow(payload, ts);

  const repositories = runtime.getRepositoriesForTenant(payload.tenantId);
  const input: AnalyticsEngineInput = {
    tenantId: payload.tenantId,
    repositories,
    window: { start: resolved.start, end: resolved.end },
    asOf: resolved.asOf
  };

  const { rebuildDailyMart } = await import("@fleetmind/analytics/daily-mart.js");
  const { persistForecastEvaluations } = await import("@fleetmind/analytics/persist-forecast-evaluations.js");
  const { persistPredictionBatches } = await import("@fleetmind/analytics/persist-predictions.js");
  const { runBatchPredictions } = await import("@fleetmind/analytics/run-batch-predictions.js");

  await rebuildDailyMart(input);
  const batches = await runBatchPredictions(input, runtime.analytics, {
    horizonDays: payload.horizonDays,
    ...(payload.segmentScopes ? { segmentScopes: payload.segmentScopes } : {})
  });
  const allForecasts = batches.flatMap((batch) => batch.forecasts);
  await persistForecastEvaluations(repositories, allForecasts);
  await persistPredictionBatches(repositories, batches);
  return { skipped: false };
}
