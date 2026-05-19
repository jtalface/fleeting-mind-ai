import type { Job } from "bullmq";
import { integrationSyncJobPayloadSchema } from "@fleetmind/shared/contracts/jobs.js";
import type { IdempotencyGuard } from "../idempotency.js";
import type { IntegrationSyncRunner } from "../runtime/types.js";

export async function processIntegrationSync(
  job: Job,
  runner: IntegrationSyncRunner,
  idempotency: IdempotencyGuard
): Promise<{ skipped: boolean }> {
  const payload = integrationSyncJobPayloadSchema.parse(job.data);

  if (payload.idempotencyKey) {
    const key = `${payload.tenantId}:${payload.idempotencyKey}`;
    const acquired = await idempotency.tryAcquire(key);
    if (!acquired) {
      return { skipped: true };
    }
  }

  await runner.run(payload);
  return { skipped: false };
}
