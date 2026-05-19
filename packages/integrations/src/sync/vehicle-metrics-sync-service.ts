import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { IntegrationSyncResult } from "@fleetmind/shared/contracts/integrations.js";
import { buildTripsFromTelemetry } from "../../../telemetry/src/trip-builder.js";
import type { TelemetryIngestService } from "@fleetmind/telemetry/ingest-service.js";

const timestampKey = (vehicleId: string, iso: string): string =>
  `${vehicleId}|${Math.floor(Date.parse(iso) / 1000)}`;
import type { FleetMetricsApiClient } from "../client/fleet-metrics-api-client.js";
import {
  getDeviceCursor,
  parseDeviceCursors,
  serializeDeviceCursors,
  setDeviceCursor,
  type DeviceCursorMap
} from "./sync-cursor.js";
import {
  backfillFromUnix,
  resolveSyncOptions,
  sleep,
  type VehicleMetricsSyncOptions
} from "./sync-options.js";
import { applyDeviceCap, filterExternalVehicles } from "./vehicle-filter.js";

export interface VehicleMetricsSyncInput {
  tenantId: string;
  connector: string;
  cursor?: string;
  repositories: TenantRepositorySet;
  ingestService: TelemetryIngestService;
  apiClient: FleetMetricsApiClient;
  options?: Partial<VehicleMetricsSyncOptions>;
  onProgress?: (event: SyncProgressEvent) => void;
}

export interface SyncProgressEvent {
  phase: "vehicles" | "device" | "complete";
  message: string;
  deviceExternalId?: string;
  deviceIndex?: number;
  deviceTotal?: number;
}

export class VehicleMetricsSyncService {
  public async sync(input: VehicleMetricsSyncInput): Promise<IntegrationSyncResult> {
    const startedAt = Date.now();
    const options = resolveSyncOptions(input.options);
    const result: IntegrationSyncResult = {
      vehiclesUpserted: 0,
      telemetryIngested: 0,
      telemetryDeduplicated: 0,
      tripsCreated: 0,
      devicesProcessed: 0,
      devicesSkipped: 0,
      mode: options.mode
    };

    const externalVehicles = await input.apiClient.listVehicles();
    const totalAvailable = externalVehicles.length;
    const filtered = filterExternalVehicles(externalVehicles, {
      deviceExternalIds: options.deviceExternalIds,
      deviceNameIncludes: options.deviceNameIncludes
    });
    const selected = applyDeviceCap(filtered, options.maxDevices);

    result.devicesSkipped = Math.max(0, totalAvailable - selected.length);

    const filterHint =
      options.deviceExternalIds?.length || options.deviceNameIncludes
        ? ` filter ids=${options.deviceExternalIds?.length ?? 0} name~="${options.deviceNameIncludes ?? ""}"`
        : "";

    input.onProgress?.({
      phase: "vehicles",
      message: `Processing ${selected.length} of ${totalAvailable} devices (mode=${options.mode}, matched=${filtered.length}).${filterHint}`
    });

    const vehicleIdByExternal = new Map<string, string>();
    const cursorMap: DeviceCursorMap = parseDeviceCursors(input.cursor);
    const backfillStartUnix = backfillFromUnix(options.lookbackDays);

    for (const external of selected) {
      const vehicle = await input.repositories.vehicles.upsertFromExternal({
        externalId: external.id,
        vin: external.vin ?? `EXT-${external.id}`,
        plateNumber: external.plateNumber,
        class: external.vehicleClass,
        make: external.make,
        model: external.model,
        year: external.year,
        odometerKm: external.odometerKm,
        active: external.active
      });
      vehicleIdByExternal.set(external.id, vehicle.id);
      result.vehiclesUpserted += 1;
    }

    let deviceIndex = 0;
    for (const [externalId, internalVehicleId] of vehicleIdByExternal) {
      deviceIndex += 1;
      result.devicesProcessed += 1;

      input.onProgress?.({
        phase: "device",
        message: `Syncing device ${externalId}`,
        deviceExternalId: externalId,
        deviceIndex,
        deviceTotal: vehicleIdByExternal.size
      });

      const initialCursor =
        options.mode === "backfill"
          ? String(backfillStartUnix)
          : getDeviceCursor(cursorMap, externalId);

      let pageCursor: string | undefined = initialCursor;
      let pagesFetched = 0;
      const seenTimestampKeys = new Set<string>();

      while (pagesFetched < options.maxPagesPerDevice) {
        const page = await input.apiClient.fetchTelemetryPage(externalId, pageCursor);
        for (const point of page.items) {
          const key = timestampKey(internalVehicleId, point.timestamp);
          if (seenTimestampKeys.has(key)) {
            result.telemetryDeduplicated += 1;
            continue;
          }
          seenTimestampKeys.add(key);

          const ingestResult = await input.ingestService.ingest({
            skipTripConstruction: true,
            point: {
              vehicleId: internalVehicleId,
              timestamp: point.timestamp,
              latitude: point.latitude,
              longitude: point.longitude,
              source: "partner_api",
              speedKph: point.speedKph,
              headingDegrees: point.headingDegrees,
              engineRpm: point.engineRpm,
              ignitionOn: point.ignitionOn,
              fuelLevelPct: point.fuelLevelPct,
              odometerKm: point.odometerKm,
              engineHours: point.engineHours
            }
          });

          if (ingestResult.deduplicated) {
            result.telemetryDeduplicated += 1;
          } else {
            result.telemetryIngested += 1;
          }
        }

        pagesFetched += 1;
        if (page.nextCursor) {
          setDeviceCursor(cursorMap, externalId, page.nextCursor);
          pageCursor = page.nextCursor;
        } else if (page.items.length > 0) {
          const maxTs = Math.max(...page.items.map((p) => Math.floor(Date.parse(p.timestamp) / 1000)));
          setDeviceCursor(cursorMap, externalId, String(maxTs + 1));
        }

        if (!page.nextCursor) {
          break;
        }
      }

      const timeline = await input.repositories.telemetry.listByVehicle(internalVehicleId, 2000);
      const candidateTrips = buildTripsFromTelemetry(timeline);
      const existingTrips = await input.repositories.trips.listByVehicle(internalVehicleId);
      const existingTripSignatures = new Set(
        existingTrips.map((trip) => `${trip.vehicleId}|${trip.startTime}|${trip.endTime}`)
      );
      for (const trip of candidateTrips) {
        const signature = `${trip.vehicleId}|${trip.startTime}|${trip.endTime}`;
        if (existingTripSignatures.has(signature)) {
          continue;
        }
        await input.repositories.trips.create(trip);
        existingTripSignatures.add(signature);
        result.tripsCreated += 1;
      }

      if (deviceIndex < vehicleIdByExternal.size && options.delayMsBetweenDevices > 0) {
        await sleep(options.delayMsBetweenDevices);
      }
    }

    result.nextCursor = serializeDeviceCursors(cursorMap);
    result.durationMs = Date.now() - startedAt;

    const syncRepo = input.repositories.integrationSync;
    if (syncRepo) {
      await syncRepo.upsert({
        tenantId: input.tenantId,
        connector: input.connector,
        cursor: result.nextCursor,
        lastSyncedAt: new Date().toISOString(),
        lastStatus: "ok"
      });
    }

    input.onProgress?.({
      phase: "complete",
      message: `Sync complete: ${result.telemetryIngested} points ingested across ${result.devicesProcessed} devices in ${result.durationMs}ms.`
    });

    return result;
  }
}
