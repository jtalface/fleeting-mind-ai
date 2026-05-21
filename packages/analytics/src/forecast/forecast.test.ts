import { describe, expect, it } from "vitest";
import { benchmarkHistoryFixture } from "../fixtures.js";
import { backtestCandidates, selectChampion } from "./backtest.js";
import { ChampionForecastEngine } from "./champion-engine.js";
import { DeterministicForecastEngine } from "../forecast.js";

describe("ChampionForecastEngine", () => {
  it("selects a backtested champion among ETS, seasonal naive, and boosting", () => {
    const series = benchmarkHistoryFixture.map((point) => point.revenue);
    const candidates = backtestCandidates(series);
    expect(candidates.length).toBe(3);
    expect(candidates.map((item) => item.algorithm)).toEqual(
      expect.arrayContaining(["seasonal_naive", "ets", "gradient_boosting_stumps"])
    );

    const champion = selectChampion(candidates);
    const engine = new ChampionForecastEngine();
    const forecast = engine.forecast("tenant_c", "revenue", benchmarkHistoryFixture, "2026-04-14T00:00:00.000Z", 3);

    expect(forecast.explanation.championSelected).toBe(true);
    expect(forecast.explanation.algorithm).toBe(champion);
    expect(forecast.explanation.candidates?.length).toBe(3);
    expect(forecast.predictedPoints).toHaveLength(3);
    expect(forecast.predictedPoints.every((point) => point.lowerBound <= point.value)).toBe(true);
  });

  it("runs champion backtest with as few as five daily observations", () => {
    const shortHistory = benchmarkHistoryFixture.slice(0, 5);
    const series = shortHistory.map((point) => point.revenue);
    const candidates = backtestCandidates(series);
    expect(candidates.length).toBe(3);
  });

  it("does not use linear regression for production forecasts", () => {
    const engine = new ChampionForecastEngine();
    const forecast = engine.forecast("tenant_c", "revenue", benchmarkHistoryFixture, "2026-04-14T00:00:00.000Z", 3);
    expect(forecast.explanation.algorithm).not.toBe("linear_regression_with_residual_band");
  });
});

describe("DeterministicForecastEngine", () => {
  it("remains available for legacy comparisons", () => {
    const engine = new DeterministicForecastEngine();
    const forecast = engine.forecast("tenant_c", "revenue", benchmarkHistoryFixture, "2026-04-14T00:00:00.000Z", 3);
    expect(forecast.explanation.algorithm).toBe("linear_regression_with_residual_band");
  });
});
