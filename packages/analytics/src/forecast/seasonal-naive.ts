import { round } from "./math.js";

/** Repeats the last full seasonal cycle (default weekly) for the forecast horizon. */
export function seasonalNaiveForecast(series: number[], horizon: number, seasonPeriod = 7): number[] {
  if (series.length === 0) {
    return Array.from({ length: horizon }, () => 0);
  }
  const period = Math.max(1, Math.min(seasonPeriod, series.length));
  return Array.from({ length: horizon }, (_, index) => {
    const lagIndex = series.length - period + (index % period);
    return round(series[lagIndex] ?? series[series.length - 1] ?? 0);
  });
}
