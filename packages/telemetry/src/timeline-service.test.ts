import { describe, expect, it } from "vitest";
import { createVehicleTimelineService, query_vehicle_timeline } from "./timeline-service.js";

const createTimelineRepositories = () => {
  const telemetryStore: Array<{
    tenantId: string;
    vehicleId: string;
    timestamp: string;
    latitude: number;
    longitude: number;
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
    telemetryStore,
    tripsStore,
    repositories: {
      telemetry: {
        create: async (input: Omit<(typeof telemetryStore)[number], "tenantId">) => {
          const record = { ...input, tenantId: "tenant_test" };
          telemetryStore.push(record);
          return record;
        },
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
    }
  };
};

describe("VehicleTimelineService", () => {
  it("exposes query_vehicle_timeline facade", async () => {
    const setup = createTimelineRepositories();

    await setup.repositories.telemetry.create({
      vehicleId: "veh_facade",
      timestamp: "2026-05-07T10:00:00.000Z",
      latitude: 10,
      longitude: 10,
      source: "device"
    });

    const timeline = await query_vehicle_timeline(setup.repositories as never, {
      vehicleId: "veh_facade"
    });
    expect(timeline.vehicleId).toBe("veh_facade");
    expect(timeline.telemetryPoints).toHaveLength(1);
  });

  it("returns telemetry and trips ordered chronologically", async () => {
    const setup = createTimelineRepositories();
    const service = createVehicleTimelineService(setup.repositories as never);

    await setup.repositories.telemetry.create({
      vehicleId: "veh_1",
      timestamp: "2026-05-07T10:10:00.000Z",
      latitude: 1,
      longitude: 1,
      source: "device"
    });
    await setup.repositories.telemetry.create({
      vehicleId: "veh_1",
      timestamp: "2026-05-07T10:00:00.000Z",
      latitude: 0,
      longitude: 0,
      source: "device"
    });

    await setup.repositories.trips.create({
      vehicleId: "veh_1",
      startTime: "2026-05-07T11:00:00.000Z",
      endTime: "2026-05-07T11:30:00.000Z",
      startOdometerKm: 100,
      endOdometerKm: 120,
      distanceKm: 20,
      idleMinutes: 2,
      averageSpeedKph: 40
    });
    await setup.repositories.trips.create({
      vehicleId: "veh_1",
      startTime: "2026-05-07T09:00:00.000Z",
      endTime: "2026-05-07T09:30:00.000Z",
      startOdometerKm: 50,
      endOdometerKm: 70,
      distanceKm: 20,
      idleMinutes: 1,
      averageSpeedKph: 40
    });

    const timeline = await service.queryVehicleTimeline({ vehicleId: "veh_1" });
    expect(timeline.telemetryPoints.map((point) => point.timestamp)).toEqual([
      "2026-05-07T10:00:00.000Z",
      "2026-05-07T10:10:00.000Z"
    ]);
    expect(timeline.trips.map((trip) => trip.startTime)).toEqual([
      "2026-05-07T09:00:00.000Z",
      "2026-05-07T11:00:00.000Z"
    ]);
  });

  it("keeps vehicle boundaries isolated", async () => {
    const setup = createTimelineRepositories();
    const service = createVehicleTimelineService(setup.repositories as never);

    await setup.repositories.telemetry.create({
      vehicleId: "veh_a",
      timestamp: "2026-05-07T10:00:00.000Z",
      latitude: 0,
      longitude: 0,
      source: "device"
    });
    await setup.repositories.telemetry.create({
      vehicleId: "veh_b",
      timestamp: "2026-05-07T10:01:00.000Z",
      latitude: 2,
      longitude: 2,
      source: "device"
    });

    const timeline = await service.queryVehicleTimeline({ vehicleId: "veh_a" });
    expect(timeline.telemetryPoints).toHaveLength(1);
    expect(timeline.telemetryPoints[0]?.vehicleId).toBe("veh_a");
  });
});
