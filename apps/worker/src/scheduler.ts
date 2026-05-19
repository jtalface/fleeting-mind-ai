import type { Queue } from "bullmq";
import type { WorkerEnv } from "./config.js";
import type { FleetMindQueues } from "./queues.js";

/**
 * Registers BullMQ repeatable jobs per configured tenant (rolling 24h UTC windows).
 * Requires WORKER_SCHEDULER_ENABLED and WORKER_SCHEDULED_TENANT_IDS.
 */
export async function registerScheduledJobs(queues: FleetMindQueues, env: WorkerEnv): Promise<() => Promise<void>> {
  if (!env.schedulerEnabled || env.scheduledTenantIds.length === 0) {
    return async () => {};
  }

  for (const tenantId of env.scheduledTenantIds) {
    await queues.batchAnalytics.add(
      "scheduled-batch-analytics",
      {
        tenantId,
        windowPreset: "last_24h_utc",
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
        windowPreset: "last_24h_utc",
        asOf: new Date().toISOString(),
        horizonDays: 14
      },
      {
        repeat: { pattern: env.cronForecastRefresh },
        jobId: `repeat-forecast-${tenantId}`
      }
    );

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
  }

  return async () => {
    const sweep = async (queue: Queue) => {
      const repeatables = await queue.getRepeatableJobs();
      await Promise.all(repeatables.map((meta) => queue.removeRepeatableByKey(meta.key)));
    };
    await Promise.all([sweep(queues.batchAnalytics), sweep(queues.forecastRefresh), sweep(queues.integrationSync)]);
  };
}
