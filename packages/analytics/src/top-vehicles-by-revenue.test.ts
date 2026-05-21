import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "../../database/src/repositories/in-memory.js";
import { topVehiclesByRevenue } from "./top-vehicles-by-revenue.js";

describe("topVehiclesByRevenue", () => {
  it("ranks vehicles by trip revenue in the window", async () => {
    const repos = createInMemoryTenantRepositories("tenant_test");
    const vehicleA = await repos.vehicles.create({
      vin: "VIN_A",
      plateNumber: "HIGH",
      class: "truck",
      active: true
    });
    const vehicleB = await repos.vehicles.create({
      vin: "VIN_B",
      plateNumber: "LOW",
      class: "truck",
      active: true
    });

    const window = {
      start: "2026-05-01T00:00:00.000Z",
      end: "2026-05-10T00:00:00.000Z"
    };

    await repos.trips.create({
      vehicleId: vehicleA.id,
      startTime: "2026-05-02T08:00:00.000Z",
      endTime: "2026-05-02T10:00:00.000Z",
      startOdometerKm: 0,
      endOdometerKm: 100,
      distanceKm: 100,
      idleMinutes: 0,
      averageSpeedKph: 50
    });
    await repos.trips.create({
      vehicleId: vehicleB.id,
      startTime: "2026-05-03T08:00:00.000Z",
      endTime: "2026-05-03T09:00:00.000Z",
      startOdometerKm: 0,
      endOdometerKm: 10,
      distanceKm: 10,
      idleMinutes: 0,
      averageSpeedKph: 20
    });

    const ranked = await topVehiclesByRevenue(
      { tenantId: "tenant_test", repositories: repos, window, asOf: window.end },
      2
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.vehicleId).toBe(vehicleA.id);
    expect(ranked[0]?.revenue).toBeGreaterThan(ranked[1]?.revenue ?? 0);
    expect(ranked[0]?.label).toBe("HIGH");
  });
});
