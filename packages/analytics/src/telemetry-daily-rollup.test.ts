import type { TelemetryPoint } from "@fleetmind/shared/contracts/domain.js";
import { describe, expect, it } from "vitest";
import { buildDailyAggregatesFromTelemetry, mergeTripAndTelemetryDailyMaps } from "./telemetry-daily-rollup.js";
import { emptyDailyAccumulator } from "./trip-daily-rollup.js";

const rateCard = { tenantId: "t1", revenuePerKm: 2, operatingCostPerKm: 0.5, currency: "USD" };

const point = (day: number, lat: number): TelemetryPoint => ({
  tenantId: "t1",
  vehicleId: "v1",
  timestamp: `2026-04-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  latitude: lat,
  longitude: -114.6,
  source: "partner_api"
});

describe("telemetry-daily-rollup", () => {
  it("creates one aggregate row per UTC day with GPS points", () => {
    const byDay = buildDailyAggregatesFromTelemetry(
      [point(1, 32.7), point(1, 32.71), point(2, 32.72), point(2, 32.73), point(3, 32.74)],
      rateCard,
      { start: "2026-04-01T00:00:00.000Z", end: "2026-04-30T23:59:59.999Z" }
    );
    expect(byDay.size).toBe(3);
    const totalRevenue = [...byDay.values()].reduce((sum, row) => sum + row.revenue, 0);
    expect(totalRevenue).toBeGreaterThan(0);
  });

  it("merge adds telemetry-only days not present in trip rollup", () => {
    const tripByDay = new Map([["2026-04-10", { ...emptyDailyAccumulator(), revenue: 100, distanceKm: 50 }]]);
    const telemetryByDay = buildDailyAggregatesFromTelemetry(
      [point(1, 32.7), point(1, 32.71), point(5, 32.8), point(5, 32.81)],
      rateCard,
      { start: "2026-04-01T00:00:00.000Z", end: "2026-04-30T23:59:59.999Z" }
    );
    const merged = mergeTripAndTelemetryDailyMaps(tripByDay, telemetryByDay);
    expect(merged.size).toBeGreaterThanOrEqual(3);
    expect(merged.has("2026-04-01")).toBe(true);
    expect(merged.has("2026-04-05")).toBe(true);
    expect(merged.get("2026-04-10")?.revenue).toBe(100);
  });
});
