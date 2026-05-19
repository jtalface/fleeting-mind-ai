import { Worker } from "bullmq";
import type { RedisOptions } from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import { JOB_QUEUE_NAMES } from "@fleetmind/shared/contracts/jobs.js";
import { attachDeadLetterForwarding } from "./dlq.js";
import { RedisIdempotencyGuard } from "./idempotency.js";
import type { FleetMindQueues } from "./queues.js";
import { processBatchAnalytics } from "./processors/batch-analytics.js";
import { processForecastRefresh } from "./processors/forecast-refresh.js";
import { processIntegrationSync } from "./processors/integration-sync.js";
import type { IntegrationSyncRunner, WorkerRuntime } from "./runtime/types.js";

export interface FleetMindWorkers {
  batchAnalytics: Worker;
  forecastRefresh: Worker;
  integrationSync: Worker;
  close: () => Promise<void>;
}

export function createFleetMindWorkers(
  connection: RedisOptions,
  queues: FleetMindQueues,
  runtime: WorkerRuntime,
  integrationRunner: IntegrationSyncRunner,
  redis: RedisClient
): FleetMindWorkers {
  const idempotency = new RedisIdempotencyGuard(redis, "fleetmind:idem:", 86_400);
  const concurrency = 5;

  const batchAnalytics = new Worker(
    JOB_QUEUE_NAMES.BATCH_ANALYTICS,
    async (job) => processBatchAnalytics(job, runtime, idempotency),
    { connection, concurrency }
  );

  const forecastRefresh = new Worker(
    JOB_QUEUE_NAMES.FORECAST_REFRESH,
    async (job) => processForecastRefresh(job, runtime, idempotency),
    { connection, concurrency }
  );

  const integrationSync = new Worker(
    JOB_QUEUE_NAMES.INTEGRATION_SYNC,
    async (job) => processIntegrationSync(job, integrationRunner, idempotency),
    { connection, concurrency }
  );

  attachDeadLetterForwarding(batchAnalytics, queues.deadLetter, JOB_QUEUE_NAMES.BATCH_ANALYTICS);
  attachDeadLetterForwarding(forecastRefresh, queues.deadLetter, JOB_QUEUE_NAMES.FORECAST_REFRESH);
  attachDeadLetterForwarding(integrationSync, queues.deadLetter, JOB_QUEUE_NAMES.INTEGRATION_SYNC);

  return {
    batchAnalytics,
    forecastRefresh,
    integrationSync,
    close: async () => {
      await Promise.all([batchAnalytics.close(), forecastRefresh.close(), integrationSync.close()]);
    }
  };
}
