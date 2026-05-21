import { describe, expect, it } from "vitest";
import { ChampionForecastEngine } from "./champion-engine.js";
import { holdoutResidualQuantileOffsets } from "./backtest.js";

describe("quantile forecast bands", () => {
  it("holdoutResidualQuantileOffsets returns ordered P10/P90 offsets", () => {
    const series = [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17];
    const { p10Offset, p90Offset } = holdoutResidualQuantileOffsets(series, "ets");
    expect(p10Offset).toBeLessThanOrEqual(p90Offset);
  });

  it("ChampionForecastEngine emits p10, p50, p90 on each point", () => {
    const engine = new ChampionForecastEngine();
    const history = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      revenue: 1000 + i * 50,
      cost: 400 + i * 10,
      fuelCostPerKm: 0.2,
      idleRatioPct: 10,
      utilizationPct: 80
    }));
    const forecast = engine.forecast("tenant_demo", "revenue", history, "2026-05-14T12:00:00.000Z", 7);
    expect(forecast.predictedPoints.length).toBe(7);
    for (const point of forecast.predictedPoints) {
      expect(point.p10).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p90);
      expect(point.value).toBe(point.p50);
      expect(point.lowerBound).toBe(point.p10);
      expect(point.upperBound).toBe(point.p90);
    }
  });
});
