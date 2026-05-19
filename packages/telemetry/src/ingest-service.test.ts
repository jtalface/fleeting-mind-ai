import { describe, expect, it } from "vitest";
import { createTelemetryIngestService } from "./ingest-service.js";

const createTestRepositories = () => {
  const telemetryStore: Array<{
    tenantId: string;
    vehicleId: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    speedKph?: number;
    ignitionOn?: boolean;
    odometerKm?: number;
    source: "device" | "partner_api" | "manual";
  }> = [];
  const tripsStore: Array<{
    id: string;
    tenantId: string;
    vehicleId: string;
    startTime: string;
    endTime: string;
    startOdometerKm: number;
    endOdometerKm: number;
    distanceKm: number;
    idleMinutes: number;
    averageSpeedKph: number;
  }> = [];

  return {
    telemetry: {
      create: async (input: Omit<(typeof telemetryStore)[number], "tenantId">) => {
        const record = { ...input, tenantId: "tenant_test" };
        telemetryStore.push(record);
        return record;
      },
      findByVehicleAndTimestamp: async (vehicleId: string, timestamp: string) =>
        telemetryStore.find((point) => point.vehicleId === vehicleId && point.timestamp === timestamp) ?? null,
      listByVehicle: async (vehicleId: string, limit = 100) =>
        telemetryStore
          .filter((point) => point.vehicleId === vehicleId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, limit)
    },
    trips: {
      create: async (input: Omit<(typeof tripsStore)[number], "id" | "tenantId">) => {
        const record = { ...input, id: `trip_${tripsStore.length + 1}`, tenantId: "tenant_test" };
        tripsStore.push(record);
        return record;
      },
      listByVehicle: async (vehicleId: string) =>
        tripsStore.filter((trip) => trip.vehicleId === vehicleId).sort((a, b) => b.startTime.localeCompare(a.startTime))
    }
  };
};

describe("TelemetryIngestService", () => {
  it("deduplicates by vehicle and timestamp (flespi second-level timestamps)", async () => {
    const repositories = createTestRepositories();
    const service = createTelemetryIngestService(repositories as never);

    const first = await service.ingest({
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        source: "partner_api"
      }
    });
    const second = await service.ingest({
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 37.775,
        longitude: -122.42,
        source: "partner_api"
      }
    });

    const stored = await repositories.telemetry.listByVehicle("veh_1", 10);
    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(stored).toHaveLength(1);
  });

  it("deduplicates identical points", async () => {
    const repositories = createTestRepositories();
    const service = createTelemetryIngestService(repositories as never);

    const payload = {
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        speedKph: 42,
        ignitionOn: true,
        source: "device" as const
      }
    };

    const first = await service.ingest(payload);
    const second = await service.ingest(payload);

    const stored = await repositories.telemetry.listByVehicle("veh_1", 10);
    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(stored).toHaveLength(1);
  });

  it("builds trips from out-of-order telemetry points", async () => {
    const repositories = createTestRepositories();
    const service = createTelemetryIngestService(repositories as never);

    await service.ingest({
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:10:00.000Z",
        latitude: 37.7754,
        longitude: -122.4174,
        speedKph: 40,
        ignitionOn: true,
        odometerKm: 1005,
        source: "device"
      }
    });
    await service.ingest({
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        speedKph: 30,
        ignitionOn: true,
        odometerKm: 1000,
        source: "device"
      }
    });
    await service.ingest({
      point: {
        vehicleId: "veh_1",
        timestamp: "2026-05-07T10:12:00.000Z",
        latitude: 37.7755,
        longitude: -122.417,
        speedKph: 0,
        ignitionOn: false,
        odometerKm: 1006,
        source: "device"
      }
    });

    const trips = await repositories.trips.listByVehicle("veh_1");
    expect(trips).toHaveLength(1);
    expect(trips[0]?.startTime).toBe("2026-05-07T10:00:00.000Z");
    expect(trips[0]?.endTime).toBe("2026-05-07T10:10:00.000Z");
  });

  it("keeps tenant boundaries isolated", async () => {
    const tenantA = createTestRepositories();
    const tenantB = createTestRepositories();
    const serviceA = createTelemetryIngestService(tenantA as never);
    const serviceB = createTelemetryIngestService(tenantB as never);

    await serviceA.ingest({
      point: {
        vehicleId: "veh_a",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        ignitionOn: true,
        source: "device"
      }
    });
    await serviceB.ingest({
      point: {
        vehicleId: "veh_b",
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 40.7128,
        longitude: -74.006,
        ignitionOn: true,
        source: "device"
      }
    });

    const telemetryA = await tenantA.telemetry.listByVehicle("veh_a", 10);
    const telemetryB = await tenantB.telemetry.listByVehicle("veh_b", 10);

    expect(telemetryA).toHaveLength(1);
    expect(telemetryB).toHaveLength(1);
    expect(telemetryA[0]?.latitude).toBe(37.7749);
    expect(telemetryB[0]?.latitude).toBe(40.7128);
  });
});
