import type { Queue } from "bullmq";
import type { WorkerEnv } from "./config.js";
import type { FleetMindQueues } from "./queues.js";
import {
  forecastWindowPresetForLookbackDays,
  resolveAnalyticsHotLookbackDays
} from "@fleetmind/analytics/forecast-lookback.js";

const windowPayloadForLookback = (lookbackDays: number, asOf: string) => {
  const preset = forecastWindowPresetForLookbackDays(lookbackDays);
  if (preset === "explicit") {
    const end = new Date(asOf);
    const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    return {
      windowPreset: "explicit" as const,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString()
    };
  }
  return { windowPreset: preset };
};

/**
 * Registers BullMQ repeatable jobs per configured tenant.
 * Pipeline order (default cron): integration sync → batch analytics → forecast refresh.
 * Batch analytics uses hot lookback (default 7d); forecast refresh uses training lookback (default 30d).
 * Requires WORKER_SCHEDULER_ENABLED and WORKER_SCHEDULED_TENANT_IDS.
 */
export async function registerScheduledJobs(queues: FleetMindQueues, env: WorkerEnv): Promise<() => Promise<void>> {
  if (!env.schedulerEnabled || env.scheduledTenantIds.length === 0) {
    return async () => {};
  }

  const analyticsLookback = resolveAnalyticsHotLookbackDays(env.scheduledLookbackDays);
  const forecastLookback = env.forecastTrainingLookbackDays;

  for (const tenantId of env.scheduledTenantIds) {
    const asOf = new Date().toISOString();
    const analyticsWindow = windowPayloadForLookback(analyticsLookback, asOf);
    const forecastWindow = windowPayloadForLookback(forecastLookback, asOf);

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
        ...analyticsWindow,
        asOf
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
        ...forecastWindow,
        asOf,
        horizonDays: env.scheduledForecastHorizonDays,
        topVehicles: env.scheduledForecastTopVehicles
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
