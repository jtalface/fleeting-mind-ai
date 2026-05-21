import type { ForecastAlgorithm } from "@fleetmind/shared/contracts/analytics.js";
import { etsForecast } from "./ets.js";
import { gradientBoostingStumpsForecast } from "./gradient-boost.js";
import { mapePct, round } from "./math.js";
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
  if (series.length < 2) {
    return 0;
  }
  const holdoutDays = Math.min(DEFAULT_HOLDOUT_DAYS, Math.max(1, series.length - 1));
  const train = series.slice(0, -holdoutDays);
  const predicted = forecastWithAlgorithm(algorithm, train, holdoutDays);
  const actual = series.slice(-holdoutDays);
  const residuals = actual.map((value, index) => value - (predicted[index] ?? value));
  const variance = residuals.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, residuals.length);
  return round(Math.sqrt(variance));
}
