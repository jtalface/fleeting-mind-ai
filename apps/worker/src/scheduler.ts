import type { Queue } from "bullmq";
import type { WorkerEnv } from "./config.js";
import type { FleetMindQueues } from "./queues.js";

/**
 * Registers BullMQ repeatable jobs per configured tenant.
 * Pipeline order (default cron): integration sync → batch analytics → forecast refresh.
 * Analytics/forecast use rolling 7d UTC windows when WORKER_SCHEDULED_LOOKBACK_DAYS=7.
 * Requires WORKER_SCHEDULER_ENABLED and WORKER_SCHEDULED_TENANT_IDS.
 */
export async function registerScheduledJobs(queues: FleetMindQueues, env: WorkerEnv): Promise<() => Promise<void>> {
  if (!env.schedulerEnabled || env.scheduledTenantIds.length === 0) {
    return async () => {};
  }

  const windowPreset = env.scheduledLookbackDays === 7 ? "last_7d_utc" : "explicit";
  const windowPayload =
    windowPreset === "last_7d_utc"
      ? { windowPreset: "last_7d_utc" as const }
      : (() => {
          const end = new Date();
          const start = new Date(end.getTime() - env.scheduledLookbackDays * 24 * 60 * 60 * 1000);
          return {
            windowPreset: "explicit" as const,
            windowStart: start.toISOString(),
            windowEnd: end.toISOString()
          };
        })();

  for (const tenantId of env.scheduledTenantIds) {
    await queues.integrationSync.add(
      "scheduled-integration-sync",
      {
        tenantId,
        connector: "partner_api"
      },
      {
        repeat: { pattern: env.cronIntegrationSync },
        jobId: `repeat-integration-${tenantId}`
      }
    );

    await queues.batchAnalytics.add(
      "scheduled-batch-analytics",
      {
        tenantId,
        ...windowPayload,
        asOf: new Date().toISOString()
      },
      {
        repeat: { pattern: env.cronBatchAnalytics },
        jobId: `repeat-batch-analytics-${tenantId}`
      }
    );

    await queues.forecastRefresh.add(
      "scheduled-forecast-refresh",
      {
        tenantId,
        ...windowPayload,
        asOf: new Date().toISOString(),
        horizonDays: env.scheduledForecastHorizonDays
      },
      {
        repeat: { pattern: env.cronForecastRefresh },
        jobId: `repeat-forecast-${tenantId}`
      }
    );

    await queues.integrationSync.add(
      "scheduled-deep-backfill",
      {
        tenantId,
        connector: "partner_api",
        mode: "backfill",
        lookbackDays: env.deepBackfillLookbackDays,
        maxPagesPerDevice: 5,
        deviceNameIncludes: env.deepBackfillDeviceNameIncludes,
        idempotencyKey: `deep-backfill-${env.deepBackfillLookbackDays}d-${new Date().toISOString().slice(0, 10)}`
      },
      {
        repeat: { pattern: env.cronDeepBackfill },
        jobId: `repeat-deep-backfill-${tenantId}`
      }
    );
  }

  return async () => {
    const sweep = async (queue: Queue) => {
      const repeatables = await queue.getRepeatableJobs();
      await Promise.all(repeatables.map((meta) => queue.removeRepeatableByKey(meta.key)));
    };
    await Promise.all([
      sweep(queues.batchAnalytics),
      sweep(queues.forecastRefresh),
      sweep(queues.integrationSync)
    ]);
  };
}
