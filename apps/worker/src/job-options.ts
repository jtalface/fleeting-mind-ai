import type { DefaultJobOptions, JobsOptions } from "bullmq";

/**
 * Shared BullMQ job defaults: bounded retries, exponential backoff, keep failed jobs for DLQ forwarding.
 */
export const DEFAULT_WORKER_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000
  },
  removeOnComplete: {
    age: 86_400,
    count: 5000
  },
  removeOnFail: false
};

export const asDefaultJobOptions = (): DefaultJobOptions => ({
  ...DEFAULT_WORKER_JOB_OPTIONS
});
