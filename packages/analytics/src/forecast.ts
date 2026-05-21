import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { ForecastEngine, ForecastQualityMetrics } from "./contracts.js";

const round = (value: number): number => Math.round(value * 10000) / 10000;

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

const stdDev = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mu = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const linearRegression = (y: number[]): { slope: number; intercept: number } => {
  const n = y.length;
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }

  const xMean = (n - 1) / 2;
  const yMean = mean(y);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < n; index += 1) {
    const dx = index - xMean;
    numerator += dx * ((y[index] ?? 0) - yMean);
    denominator += dx * dx;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
};

const buildFutureDate = (asOf: string, day: number): string => {
  const date = new Date(asOf);
  date.setUTCDate(date.getUTCDate() + day);
  return date.toISOString().slice(0, 10);
};

export class DeterministicForecastEngine implements ForecastEngine {
  public forecast(
    tenantId: string,
    metricKey: DeterministicForecast["metricKey"],
    history: Array<{
      date: string;
      revenue: number;
      cost: number;
      fuelCostPerKm: number;
      idleRatioPct: number;
      utilizationPct: number;
    }>,
    asOf: string,
    horizonDays: number
  ): DeterministicForecast {
    const series = history.map((point) => {
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
    const { slope, intercept } = linearRegression(series);
    const residuals = series.map((actual, index) => actual - (intercept + slope * index));
    const residualStdDev = stdDev(residuals);
    const band = residualStdDev * 1.96;
    const predictedPoints = Array.from({ length: horizonDays }, (_, index) => {
      const x = series.length + index;
      const value = intercept + slope * x;
      return {
        date: buildFutureDate(asOf, index + 1),
        value: round(value),
        lowerBound: round(value - band),
        upperBound: round(value + band)
      };
    });

    return {
      tenantId,
      metricKey,
      trainedUntil: asOf,
      horizonDays,
      predictedPoints,
      explanation: {
        algorithm: "linear_regression_with_residual_band",
        slopePerDay: round(slope),
        intercept: round(intercept),
        sampleSize: series.length,
        residualStdDev: round(residualStdDev)
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
