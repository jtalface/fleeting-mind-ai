import type { Job, Queue, Worker } from "bullmq";

export interface DeadLetterPayload<TData = unknown> {
  sourceQueue: string;
  jobName: string;
  attemptsMade: number;
  failedReason: string;
  data: TData;
}

export function isFinalFailure(job: Job): boolean {
  const maxAttempts = job.opts.attempts ?? 1;
  return job.attemptsMade >= maxAttempts;
}

export function attachDeadLetterForwarding(worker: Worker, deadLetterQueue: Queue, sourceQueueName: string): void {
  worker.on("failed", async (job: Job | undefined, error: unknown) => {
    if (!job || !isFinalFailure(job)) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);

    const payload: DeadLetterPayload = {
      sourceQueue: sourceQueueName,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      failedReason: message,
      data: job.data
    };

    await deadLetterQueue.add(`dlq:${sourceQueueName}:${job.name}`, payload, {
      removeOnComplete: false,
      attempts: 1
    });
  });
}
