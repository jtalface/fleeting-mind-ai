/** Default rolling window for training forecasts and mart rebuild on refresh (days). */
export const DEFAULT_FORECAST_TRAINING_LOOKBACK_DAYS = 30;

/** Default rolling window for hot KPI / batch analytics jobs (days). */
export const DEFAULT_ANALYTICS_HOT_LOOKBACK_DAYS = 7;

const clampLookback = (days: number): number => Math.min(90, Math.max(7, Math.floor(days)));

/**
 * Training lookback for forecast refresh, mart rebuild on score, and mart QA.
 * Override via body/query, then FORECAST_TRAINING_LOOKBACK_DAYS / WORKER_FORECAST_TRAINING_LOOKBACK_DAYS.
 */
export function resolveForecastTrainingLookbackDays(explicit?: number): number {
  if (explicit !== undefined) {
    return clampLookback(explicit);
  }
  const raw =
    process.env.FORECAST_TRAINING_LOOKBACK_DAYS ?? process.env.WORKER_FORECAST_TRAINING_LOOKBACK_DAYS;
  const parsed = Number(raw);
  return clampLookback(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FORECAST_TRAINING_LOOKBACK_DAYS);
}

/** Hot analytics window (Insights KPIs, scheduled batch analytics). */
export function resolveAnalyticsHotLookbackDays(explicit?: number): number {
  if (explicit !== undefined) {
    return clampLookback(explicit);
  }
  const raw = process.env.ANALYTICS_HOT_LOOKBACK_DAYS ?? process.env.WORKER_SCHEDULED_LOOKBACK_DAYS;
  const parsed = Number(raw);
  return clampLookback(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYTICS_HOT_LOOKBACK_DAYS);
}

/** Maps configured training lookback to a worker window preset when it matches a standard length. */
export function forecastWindowPresetForLookbackDays(
  lookbackDays: number
): "last_7d_utc" | "last_30d_utc" | "explicit" {
  if (lookbackDays === 7) {
    return "last_7d_utc";
  }
  if (lookbackDays === 30) {
    return "last_30d_utc";
  }
  return "explicit";
}
