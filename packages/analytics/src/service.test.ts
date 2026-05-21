import { createInMemoryTenantRepositories } from "../../database/src/repositories/in-memory.js";
import { describe, expect, it } from "vitest";
import { benchmarkHistoryFixture } from "./fixtures.js";
import { ChampionForecastEngine } from "./forecast/champion-engine.js";
import { DeterministicForecastEngine } from "./forecast.js";
import { DefaultAnalyticsService } from "./service.js";

describe("DefaultAnalyticsService", () => {
  it("computes deterministic KPI metrics and emits insights", async () => {
    const repos = createInMemoryTenantRepositories("tenant_c");
    const vehicleA = await repos.vehicles.create({
      vin: "VIN-001",
      class: "truck",
      active: true
    });
    const vehicleB = await repos.vehicles.create({
      vin: "VIN-002",
      class: "van",
      active: true
    });

    await repos.trips.create({
      vehicleId: vehicleA.id,
      startTime: "2026-04-01T08:00:00.000Z",
      endTime: "2026-04-01T10:00:00.000Z",
      startOdometerKm: 1000,
      endOdometerKm: 1080,
      distanceKm: 80,
      idleMinutes: 35,
      averageSpeedKph: 55
    });
    await repos.trips.create({
      vehicleId: vehicleB.id,
      startTime: "2026-04-02T08:00:00.000Z",
      endTime: "2026-04-02T10:00:00.000Z",
      startOdometerKm: 300,
      endOdometerKm: 350,
      distanceKm: 50,
      idleMinutes: 45,
      averageSpeedKph: 40
    });
    await repos.fuel.create({
      vehicleId: vehicleA.id,
      timestamp: "2026-04-01T11:00:00.000Z",
      volumeLiters: 45,
      totalCost: 120,
      currency: "USD",
      source: "fuel_card"
    });
    await repos.fuel.create({
      vehicleId: vehicleB.id,
      timestamp: "2026-04-02T11:00:00.000Z",
      volumeLiters: 30,
      totalCost: 95,
      currency: "USD",
      source: "fuel_card"
    });

    const service = new DefaultAnalyticsService();
    const snapshot = await service.computeKpis({
      tenantId: "tenant_c",
      repositories: repos,
      window: {
        start: "2026-04-01T00:00:00.000Z",
        end: "2026-04-30T23:59:59.999Z"
      },
      asOf: "2026-04-30T23:59:59.999Z"
    });
    const insights = service.generateInsights(snapshot);

    const profit = snapshot.fleetMetrics.find((metric) => metric.metricKey === "profit");
    const idle = snapshot.fleetMetrics.find((metric) => metric.metricKey === "idle_ratio_pct");
    expect(profit?.value).toBeCloseTo(-20, 4);
    expect(idle?.value).toBeCloseTo(33.3333, 4);
    expect(insights.some((item) => item.title.includes("operating at a loss"))).toBe(true);
    expect(insights.some((item) => item.title.includes("idle ratio"))).toBe(true);
  });

  it("runs champion-selected forecasts via DefaultAnalyticsService", () => {
    const service = new DefaultAnalyticsService();
    const forecasts = service.runForecasts(
      {
        tenantId: "tenant_c",
        repositories: createInMemoryTenantRepositories("tenant_c"),
        window: { start: "2026-04-01T00:00:00.000Z", end: "2026-04-14T23:59:59.999Z" },
        asOf: "2026-04-14T00:00:00.000Z"
      },
      benchmarkHistoryFixture,
      3
    );
    const revenue = forecasts.find((item) => item.metricKey === "revenue");
    expect(revenue?.explanation.championSelected).toBe(true);
    expect(revenue?.predictedPoints).toHaveLength(3);
  });

  it("uses tenant rate cards for KPI revenue", async () => {
    const repos = createInMemoryTenantRepositories("tenant_rate");
    await repos.rateCards!.upsert({ revenuePerKm: 3, operatingCostPerKm: 1, currency: "USD" });
    const vehicle = await repos.vehicles.create({ vin: "VIN-RATE", class: "truck", active: true });
    await repos.trips.create({
      vehicleId: vehicle.id,
      startTime: "2026-04-01T08:00:00.000Z",
      endTime: "2026-04-01T10:00:00.000Z",
      startOdometerKm: 0,
      endOdometerKm: 100,
      distanceKm: 100,
      idleMinutes: 0,
      averageSpeedKph: 50
    });

    const service = new DefaultAnalyticsService();
    const snapshot = await service.computeKpis({
      tenantId: "tenant_rate",
      repositories: repos,
      window: { start: "2026-04-01T00:00:00.000Z", end: "2026-04-30T23:59:59.999Z" },
      asOf: "2026-04-30T23:59:59.999Z"
    });
    const revenue = snapshot.fleetMetrics.find((metric) => metric.metricKey === "revenue");
    expect(revenue?.value).toBe(300);
  });

  it("calculates forecast quality metrics in tests", () => {
    const engine = new DeterministicForecastEngine();
    const metrics = engine.evaluateQuality(
      [100, 110, 120, 130],
      [102, 109, 118, 131],
      [95, 103, 112, 124],
      [106, 117, 128, 136]
    );

    expect(metrics.mae).toBeCloseTo(1.5, 4);
    expect(metrics.mapePct).toBeCloseTo(1.3341, 4);
    expect(metrics.withinBandPct).toBe(100);
  });
});
