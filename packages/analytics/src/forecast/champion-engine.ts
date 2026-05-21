import type { DeterministicForecast, ForecastAlgorithm } from "@fleetmind/shared/contracts/analytics.js";
import type { AnalyticsDataPoint, ForecastEngine, ForecastQualityMetrics } from "../contracts.js";
import {
  backtestCandidates,
  DEFAULT_SEASON_PERIOD,
  forecastWithAlgorithm,
  holdoutResidualStdDev,
  selectChampion
} from "./backtest.js";
import { GRADIENT_BOOST_TREE_COUNT } from "./gradient-boost.js";
import { buildFutureDate, mean, round } from "./math.js";

const nonNegativeMetrics = new Set<DeterministicForecast["metricKey"]>([
  "revenue",
  "cost",
  "profit",
  "fuel_cost_per_km",
  "idle_ratio_pct",
  "utilization_pct"
]);

const clampLowerBound = (metricKey: DeterministicForecast["metricKey"], value: number, lower: number): number =>
  nonNegativeMetrics.has(metricKey) ? Math.max(0, lower) : lower;

const extractSeries = (
  history: AnalyticsDataPoint[],
  metricKey: DeterministicForecast["metricKey"]
): number[] =>
  history.map((point) => {
    switch (metricKey) {
      case "revenue":
        return point.revenue;
      case "cost":
        return point.cost;
      case "profit":
        return point.revenue - point.cost;
      case "fuel_cost_per_km":
        return point.fuelCostPerKm;
      case "idle_ratio_pct":
        return point.idleRatioPct;
      case "utilization_pct":
        return point.utilizationPct;
    }
  });

export class ChampionForecastEngine implements ForecastEngine {
  public forecast(
    tenantId: string,
    metricKey: DeterministicForecast["metricKey"],
    history: AnalyticsDataPoint[],
    asOf: string,
    horizonDays: number
  ): DeterministicForecast {
    const series = extractSeries(history, metricKey);
    const candidateScores = backtestCandidates(series);
    const champion = selectChampion(candidateScores);
    const championMape = candidateScores.find((item) => item.algorithm === champion)?.mapePct;
    const predictedValues = forecastWithAlgorithm(champion, series, horizonDays);
    const residualStdDev = holdoutResidualStdDev(series, champion);
    const band = residualStdDev * 1.96;

    const predictedPoints = predictedValues.map((value, index) => {
      const lower = round(value - band);
      const upper = round(value + band);
      return {
        date: buildFutureDate(asOf, index + 1),
        value: round(value),
        lowerBound: clampLowerBound(metricKey, value, lower),
        upperBound: upper
      };
    });

    return {
      tenantId,
      metricKey,
      trainedUntil: asOf,
      horizonDays,
      predictedPoints,
      explanation: {
        algorithm: champion,
        sampleSize: series.length,
        residualStdDev,
        championSelected: candidateScores.length > 0,
        ...(championMape !== undefined ? { backtestMapePct: championMape } : {}),
        ...(candidateScores.length > 0 ? { candidates: candidateScores } : {}),
        seasonPeriod: DEFAULT_SEASON_PERIOD,
        ...(champion === "gradient_boosting_stumps" ? { treeCount: GRADIENT_BOOST_TREE_COUNT } : {})
      }
    };
  }

  public evaluateQuality(
    prediction: number[],
    actual: number[],
    lowerBand: number[],
    upperBand: number[]
  ): ForecastQualityMetrics {
    if (prediction.length === 0 || prediction.length !== actual.length) {
      return { mae: 0, mapePct: 0, withinBandPct: 0 };
    }

    const errors = prediction.map((value, index) => Math.abs((actual[index] ?? 0) - value));
    const mae = mean(errors);
    const mape =
      mean(
        prediction.map((value, index) => {
          const actualValue = actual[index] ?? 0;
          if (actualValue === 0) {
            return 0;
          }
          return Math.abs((actualValue - value) / actualValue);
        })
      ) * 100;
    const withinBandCount = prediction.reduce((count, _, index) => {
      const actualValue = actual[index] ?? 0;
      const lower = lowerBand[index] ?? Number.NEGATIVE_INFINITY;
      const upper = upperBand[index] ?? Number.POSITIVE_INFINITY;
      return count + (actualValue >= lower && actualValue <= upper ? 1 : 0);
    }, 0);

    return {
      mae: round(mae),
      mapePct: round(mape),
      withinBandPct: round((withinBandCount / prediction.length) * 100)
    };
  }
}
