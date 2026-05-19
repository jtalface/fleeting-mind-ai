import type { IntegrationSyncResult } from "@fleetmind/shared/contracts/integrations.js";
import type { IntegrationSyncJobPayload } from "@fleetmind/shared/contracts/jobs.js";
import type { IntegrationSyncRunner } from "./types.js";

/** Placeholder until vendor adapters live under `packages/integrations`. */
export class NoopIntegrationSyncRunner implements IntegrationSyncRunner {
  public async run(payload: IntegrationSyncJobPayload): Promise<IntegrationSyncResult> {
    return {
      vehiclesUpserted: 0,
      telemetryIngested: 0,
      telemetryDeduplicated: 0,
      tripsCreated: 0,
      devicesProcessed: 0,
      devicesSkipped: 0,
      mode: payload.mode ?? "incremental",
      durationMs: 0
    };
  }
}
