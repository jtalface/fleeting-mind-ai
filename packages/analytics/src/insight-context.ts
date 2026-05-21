import type {
  DeterministicForecast,
  InsightGenerationContext,
  InsightForecastSummary,
  KpiSnapshot
} from "@fleetmind/shared/contracts/analytics.js";

const KPI_FORECAST_NOTE =
  "Fleet KPI values are totals or window averages over the selected analysis period. Forecast nextP50 values are daily medians from the champion model trained on daily history; they are not required to match window KPI totals.";

export function buildInsightGenerationContext(
  forecasts?: DeterministicForecast[],
  kpis?: KpiSnapshot
): InsightGenerationContext | undefined {
  if (!forecasts?.length && !kpis) {
    return undefined;
  }

  const summaries: InsightForecastSummary[] = (forecasts ?? []).map((forecast) => {
    const firstPoint = forecast.predictedPoints[0];
    const summary: InsightForecastSummary = {
      metricKey: forecast.metricKey,
      algorithm: forecast.explanation.algorithm,
      sampleSize: forecast.explanation.sampleSize,
      horizonDays: forecast.horizonDays,
      ...(firstPoint ? { nextP50: firstPoint.p50 } : {})
    };
    if (forecast.explanation.backtestMapePct !== undefined) {
      summary.backtestMapePct = forecast.explanation.backtestMapePct;
    }
    return summary;
  });

  return {
    ...(summaries.length > 0 ? { forecasts: summaries } : {}),
    analyticsNote: KPI_FORECAST_NOTE
  };
}
