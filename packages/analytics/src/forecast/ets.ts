import { round } from "./math.js";

/**
 * Additive Holt-Winters (ETS) with fixed smoothing parameters — deterministic, no external libs.
 */
export function etsForecast(series: number[], horizon: number, seasonPeriod = 7): number[] {
  const n = series.length;
  if (n === 0) {
    return Array.from({ length: horizon }, () => 0);
  }
  if (n < seasonPeriod * 2) {
    const last = series[n - 1] ?? 0;
    const slope = n > 1 ? (last - (series[n - 2] ?? last)) : 0;
    return Array.from({ length: horizon }, (_, index) => round(last + slope * (index + 1)));
  }

  const alpha = 0.35;
  const beta = 0.12;
  const gamma = 0.25;
  const period = seasonPeriod;

  let level = meanFirstSeason(series, period);
  let trend = (meanSecondSeason(series, period) - level) / period;
  const seasonal = Array.from({ length: period }, (_, index) => (series[index] ?? level) - level);

  for (let index = 0; index < n; index += 1) {
    const value = series[index] ?? 0;
    const seasonIndex = index % period;
    const season = seasonal[seasonIndex] ?? 0;
    const prevLevel = level;
    level = alpha * (value - season) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[seasonIndex] = gamma * (value - level) + (1 - gamma) * season;
  }

  const forecasts: number[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const seasonIndex = (n + step - 1) % period;
    forecasts.push(round(level + trend * step + (seasonal[seasonIndex] ?? 0)));
  }
  return forecasts;
}

function meanFirstSeason(series: number[], period: number): number {
  const slice = series.slice(0, period);
  return slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
}

function meanSecondSeason(series: number[], period: number): number {
  const slice = series.slice(period, period * 2);
  return slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
}
