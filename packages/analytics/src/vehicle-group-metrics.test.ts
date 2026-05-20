import { describe, expect, it } from "vitest";
import { filterVehiclesByNameNeedle, normalizeVehicleGroupAverages } from "./vehicle-group-metrics.js";

describe("filterVehiclesByNameNeedle", () => {
  const vehicles = [
    {
      id: "v1",
      tenantId: "t1",
      vin: "41028666",
      plateNumber: "Sweeper 7301",
      class: "truck" as const,
      active: true,
      createdAt: "",
      updatedAt: ""
    },
    {
      id: "v2",
      tenantId: "t1",
      vin: "41029001",
      plateNumber: "41029001",
      class: "truck" as const,
      active: true,
      createdAt: "",
      updatedAt: ""
    }
  ];

  it("matches case-insensitive substring on plate", () => {
    const matched = filterVehiclesByNameNeedle(vehicles, "Sweeper");
    expect(matched).toHaveLength(1);
    expect(matched[0]?.plateNumber).toBe("Sweeper 7301");
  });
});

describe("normalizeVehicleGroupAverages", () => {
  it("re-derives group idle when tool average is zero but vehicles have trips", () => {
    const normalized = normalizeVehicleGroupAverages({
      nameIncludes: "Sweeper",
      matchedCount: 2,
      fleetTotalCount: 6,
      groupAvgIdleRatioPct: 0,
      groupAvgUtilizationPct: 0,
      movingCount: 0,
      idleCount: 2,
      offlineCount: 0,
      vehicles: [
        {
          vehicleId: "v1",
          label: "SW-8092",
          idleRatioPct: 40.2,
          utilizationPct: 59.8,
          tripCount: 12,
          status: "idle"
        },
        {
          vehicleId: "v2",
          label: "SW-8093",
          idleRatioPct: 31.2,
          utilizationPct: 68.8,
          tripCount: 8,
          status: "idle"
        }
      ],
      window: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-08T00:00:00.000Z" }
    });

    expect(normalized.groupAvgIdleRatioPct).toBe(35.7);
    expect(normalized.groupAvgUtilizationPct).toBe(64.3);
  });
});
