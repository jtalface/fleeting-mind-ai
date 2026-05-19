import { Queue } from "bullmq";
import type { RedisOptions } from "ioredis";
import { JOB_QUEUE_NAMES } from "@fleetmind/shared/contracts/jobs.js";
import { asDefaultJobOptions } from "./job-options.js";

export interface FleetMindQueues {
  batchAnalytics: Queue;
  forecastRefresh: Queue;
  integrationSync: Queue;
  deadLetter: Queue;
}

export function createFleetMindQueues(connection: RedisOptions): FleetMindQueues {
  const defaults = asDefaultJobOptions();

  return {
    batchAnalytics: new Queue(JOB_QUEUE_NAMES.BATCH_ANALYTICS, {
      connection,
      defaultJobOptions: defaults
    }),
    forecastRefresh: new Queue(JOB_QUEUE_NAMES.FORECAST_REFRESH, {
      connection,
      defaultJobOptions: defaults
    }),
    integrationSync: new Queue(JOB_QUEUE_NAMES.INTEGRATION_SYNC, {
      connection,
      defaultJobOptions: defaults
    }),
    deadLetter: new Queue(JOB_QUEUE_NAMES.DEAD_LETTER, {
      connection,
      defaultJobOptions: { attempts: 1, removeOnFail: false }
    })
  };
}
