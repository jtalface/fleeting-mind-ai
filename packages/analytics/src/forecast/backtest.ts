import type { ForecastAlgorithm } from "@fleetmind/shared/contracts/analytics.js";
import { etsForecast } from "./ets.js";
import { gradientBoostingStumpsForecast } from "./gradient-boost.js";
import { mapePct, quantile, round, stdDev } from "./math.js";
import { seasonalNaiveForecast } from "./seasonal-naive.js";

export interface BacktestCandidateResult {
  algorithm: ForecastAlgorithm;
  mapePct: number;
}

export const DEFAULT_SEASON_PERIOD = 7;
export const DEFAULT_HOLDOUT_DAYS = 7;
/** Minimum daily observations before running rolling-origin champion selection. */
export const MIN_SERIES_FOR_BACKTEST = 5;

type ForecastFn = (train: number[], horizon: number) => number[];

const candidates: Array<{ algorithm: ForecastAlgorithm; forecast: ForecastFn }> = [
  {
    algorithm: "seasonal_naive",
    forecast: (train, horizon) => seasonalNaiveForecast(train, horizon, DEFAULT_SEASON_PERIOD)
  },
  {
    algorithm: "ets",
    forecast: (train, horizon) => etsForecast(train, horizon, DEFAULT_SEASON_PERIOD)
  },
  {
    algorithm: "gradient_boosting_stumps",
    forecast: (train, horizon) => gradientBoostingStumpsForecast(train, horizon)
  }
];

/** Rolling-origin holdout: fit on prefix, score last `holdoutDays` observations. */
export function backtestCandidates(
  series: number[],
  holdoutDays = DEFAULT_HOLDOUT_DAYS
): BacktestCandidateResult[] {
  if (series.length < MIN_SERIES_FOR_BACKTEST) {
    return [];
  }
  const holdout = Math.min(holdoutDays, Math.max(2, Math.floor(series.length / 4)));
  const train = series.slice(0, -holdout);
  const actual = series.slice(-holdout);

  return candidates.map(({ algorithm, forecast }) => {
    const predicted = forecast(train, holdout);
    return { algorithm, mapePct: mapePct(predicted, actual) };
  });
}

export function selectChampion(results: BacktestCandidateResult[]): ForecastAlgorithm {
  if (results.length === 0) {
    return "ets";
  }
  const sorted = [...results].sort((a, b) => a.mapePct - b.mapePct);
  return sorted[0]?.algorithm ?? "ets";
}

export function forecastWithAlgorithm(
  algorithm: ForecastAlgorithm,
  series: number[],
  horizon: number
): number[] {
  switch (algorithm) {
    case "seasonal_naive":
      return seasonalNaiveForecast(series, horizon, DEFAULT_SEASON_PERIOD);
    case "ets":
      return etsForecast(series, horizon, DEFAULT_SEASON_PERIOD);
    case "gradient_boosting_stumps":
      return gradientBoostingStumpsForecast(series, horizon);
    case "linear_regression_with_residual_band":
      return etsForecast(series, horizon, DEFAULT_SEASON_PERIOD);
  }
}

export function holdoutResidualStdDev(series: number[], algorithm: ForecastAlgorithm): number {
  const residuals = holdoutSignedResiduals(series, algorithm);
  return round(stdDev(residuals));
}

/** Signed holdout errors: actual − forecast (used for P10/P90 offsets). */
export function holdoutSignedResiduals(series: number[], algorithm: ForecastAlgorithm): number[] {
  if (series.length < 2) {
    return [];
  }
  const holdoutDays = Math.min(DEFAULT_HOLDOUT_DAYS, Math.max(1, series.length - 1));
  const train = series.slice(0, -holdoutDays);
  const predicted = forecastWithAlgorithm(algorithm, train, holdoutDays);
  const actual = series.slice(-holdoutDays);
  return actual.map((value, index) => value - (predicted[index] ?? value));
}

export interface HoldoutQuantileOffsets {
  p10Offset: number;
  p90Offset: number;
}

/** Empirical P10/P90 offsets from rolling holdout residuals (actual − forecast). */
export function holdoutResidualQuantileOffsets(
  series: number[],
  algorithm: ForecastAlgorithm
): HoldoutQuantileOffsets {
  const residuals = holdoutSignedResiduals(series, algorithm);
  if (residuals.length === 0) {
    const fallback = holdoutResidualStdDev(series, algorithm) * 1.28;
    return { p10Offset: round(-fallback), p90Offset: round(fallback) };
  }
  return {
    p10Offset: round(quantile(residuals, 0.1)),
    p90Offset: round(quantile(residuals, 0.9))
  };
}
