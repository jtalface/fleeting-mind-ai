import type { DeterministicForecast, InsightGenerationContext, InsightForecastSummary } from "@fleetmind/shared/contracts/analytics.js";

export function buildInsightGenerationContext(
  forecasts?: DeterministicForecast[]
): InsightGenerationContext | undefined {
  if (!forecasts?.length) {
    return undefined;
  }

  const summaries: InsightForecastSummary[] = forecasts.map((forecast) => {
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

  return { forecasts: summaries };
}
