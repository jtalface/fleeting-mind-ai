import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "@fleetmind/database/repositories/in-memory.js";
import { createTelemetryIngestService } from "@fleetmind/telemetry/ingest-service.js";
import { MockFleetMetricsApiClient } from "../client/fleet-metrics-api-client.js";
import { VehicleMetricsSyncService } from "./vehicle-metrics-sync-service.js";

describe("VehicleMetricsSyncService", () => {
  it("upserts vehicles and ingests telemetry from external API", async () => {
    const repositories = createInMemoryTenantRepositories("tenant_sync_test");
    const service = new VehicleMetricsSyncService();
    const client = new MockFleetMetricsApiClient({
      vehicles: [
        {
          id: "ext-1",
          vin: "VIN123",
          vehicleClass: "truck",
          active: true
        }
      ],
      telemetry: [
        {
          vehicleId: "ext-1",
          timestamp: "2026-05-07T12:00:00.000Z",
          latitude: 34.05,
          longitude: -118.25,
          speedKph: 55,
          fuelLevelPct: 80
        }
      ]
    });

    const result = await service.sync({
      tenantId: "tenant_sync_test",
      connector: "partner_api",
      repositories,
      ingestService: createTelemetryIngestService(repositories),
      apiClient: client
    });

    expect(result.vehiclesUpserted).toBe(1);
    expect(result.telemetryIngested).toBe(1);
    const vehicles = await repositories.vehicles.list();
    expect(vehicles[0]?.externalId).toBe("ext-1");
    const points = await repositories.telemetry.listByVehicle(vehicles[0]!.id, 10);
    expect(points.length).toBe(1);
    expect(points[0]?.source).toBe("partner_api");
  });
});
