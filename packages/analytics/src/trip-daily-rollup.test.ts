import type { Trip } from "@fleetmind/shared/contracts/domain.js";
import { describe, expect, it } from "vitest";
import type { emptyDailyAccumulator } from "./trip-daily-rollup.js";
import { allocateTripToDailyBuckets, buildDailyAggregatesFromTrips } from "./trip-daily-rollup.js";

const rateCard = { tenantId: "t1", revenuePerKm: 2, operatingCostPerKm: 0.5, currency: "USD" };

const longTrip: Trip = {
  id: "trip_1",
  tenantId: "t1",
  vehicleId: "v1",
  startTime: "2026-04-01T08:00:00.000Z",
  endTime: "2026-04-10T18:00:00.000Z",
  startOdometerKm: 0,
  endOdometerKm: 900,
  distanceKm: 900,
  idleMinutes: 10,
  averageSpeedKph: 40
};

describe("trip-daily-rollup", () => {
  it("spreads a multi-day trip across each UTC calendar day", () => {
    const byDay = new Map<string, ReturnType<typeof emptyDailyAccumulator>>();
    allocateTripToDailyBuckets(longTrip, rateCard, byDay);

    expect(byDay.size).toBeGreaterThanOrEqual(8);
    const totalRevenue = [...byDay.values()].reduce((sum, row) => sum + row.revenue, 0);
    expect(totalRevenue).toBeCloseTo(1800, 0);
  });

  it("buildDailyAggregatesFromTrips respects the analytics window", () => {
    const byDay = buildDailyAggregatesFromTrips([longTrip], rateCard, {
      start: "2026-04-01T00:00:00.000Z",
      end: "2026-05-19T23:59:59.999Z"
    });
    expect(byDay.size).toBeGreaterThanOrEqual(8);
  });
});
