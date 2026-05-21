import type {
  DeterministicForecast,
  InsightGenerationContext,
  InsightForecastSummary,
  KpiSnapshot
} from "@fleetmind/shared/contracts/analytics.js";
import { KPI_FORECAST_NOTE } from "@fleetmind/shared";

export { KPI_FORECAST_NOTE };

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
