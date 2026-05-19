import type { Job } from "bullmq";
import type { AnalyticsEngineInput } from "@fleetmind/analytics/contracts.js";
import { batchAnalyticsJobPayloadSchema } from "@fleetmind/shared/contracts/jobs.js";
import type { IdempotencyGuard } from "../idempotency.js";
import type { WorkerRuntime } from "../runtime/types.js";
import { batchPayloadWindowFields, resolveTenantJobWindow } from "../window-resolution.js";

export async function processBatchAnalytics(
  job: Job,
  runtime: WorkerRuntime,
  idempotency: IdempotencyGuard
): Promise<{ skipped: boolean }> {
  const payload = batchAnalyticsJobPayloadSchema.parse(job.data);

  if (payload.idempotencyKey) {
    const key = `${payload.tenantId}:${payload.idempotencyKey}`;
    const acquired = await idempotency.tryAcquire(key);
    if (!acquired) {
      return { skipped: true };
    }
  }

  const ts = typeof job.timestamp === "number" ? job.timestamp : Date.now();
  const resolved = resolveTenantJobWindow(batchPayloadWindowFields(payload), ts);

  const repositories = runtime.getRepositoriesForTenant(payload.tenantId);
  const input: AnalyticsEngineInput = {
    tenantId: payload.tenantId,
    repositories,
    window: { start: resolved.start, end: resolved.end },
    asOf: resolved.asOf
  };

  const snapshot = await runtime.analytics.computeKpis(input);
  const insights = runtime.analytics.generateInsights(snapshot);
  if (insights.length > 0) {
    const { persistInsights } = await import("@fleetmind/analytics/persist-insights.js");
    await persistInsights(repositories, insights);
  }
  return { skipped: false };
}
