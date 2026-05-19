import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { IntegrationSyncResult } from "@fleetmind/shared/contracts/integrations.js";
import type { IntegrationSyncJobPayload } from "@fleetmind/shared/contracts/jobs.js";
import { createTelemetryIngestService } from "@fleetmind/telemetry/ingest-service.js";
import type { FleetMetricsApiClient } from "../client/fleet-metrics-api-client.js";
import { resolveSyncOptions } from "./sync-options.js";
import { VehicleMetricsSyncService } from "./vehicle-metrics-sync-service.js";

export interface PartnerApiSyncRunnerDeps {
  getRepositoriesForTenant: (tenantId: string) => TenantRepositorySet;
  apiClient: FleetMetricsApiClient;
}

/**
 * Worker-facing sync runner: pulls vehicles + telemetry from the external metrics API
 * and persists through telemetry ingest + Prisma repositories.
 */
export class PartnerApiSyncRunner {
  private readonly syncService = new VehicleMetricsSyncService();

  public constructor(private readonly deps: PartnerApiSyncRunnerDeps) {}

  public async run(payload: IntegrationSyncJobPayload): Promise<IntegrationSyncResult> {
    if (payload.connector !== "partner_api") {
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

    const repositories = this.deps.getRepositoriesForTenant(payload.tenantId);
    const ingestService = createTelemetryIngestService(repositories);
    const existingState = repositories.integrationSync
      ? await repositories.integrationSync.get(payload.connector)
      : null;

    try {
      const options = resolveSyncOptions({
        mode: payload.mode ?? "incremental",
        maxDevices: payload.maxDevices,
        lookbackDays: payload.lookbackDays,
        maxPagesPerDevice: payload.maxPagesPerDevice,
        deviceExternalIds: payload.deviceExternalIds,
        deviceNameIncludes: payload.deviceNameIncludes
      });

      const result = await this.syncService.sync({
        tenantId: payload.tenantId,
        connector: payload.connector,
        cursor: payload.cursor ?? existingState?.cursor,
        repositories,
        ingestService,
        apiClient: this.deps.apiClient,
        options,
        onProgress: (event) => {
          console.warn(`[integration-sync] tenant=${payload.tenantId} ${event.message}`);
        }
      });

      console.warn(
        `[integration-sync] done tenant=${payload.tenantId} devices=${result.devicesProcessed}/${result.devicesProcessed + result.devicesSkipped} points=${result.telemetryIngested} ms=${result.durationMs}`
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      if (repositories.integrationSync) {
        await repositories.integrationSync.upsert({
          tenantId: payload.tenantId,
          connector: payload.connector,
          lastSyncedAt: new Date().toISOString(),
          lastStatus: "error",
          lastError: message
        });
      }
      throw error;
    }
  }
}
