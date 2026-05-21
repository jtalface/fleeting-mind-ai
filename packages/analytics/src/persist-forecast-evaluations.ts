import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";

export async function persistForecastEvaluations(
  repositories: TenantRepositorySet,
  forecasts: DeterministicForecast[]
): Promise<void> {
  if (!repositories.forecastEvaluations) {
    return;
  }

  await Promise.all(
    forecasts.map((forecast) =>
      repositories.forecastEvaluations!.create({
        tenantId: forecast.tenantId,
        metricKey: forecast.metricKey,
        algorithm: forecast.explanation.algorithm,
        trainedUntil: forecast.trainedUntil,
        horizonDays: forecast.horizonDays,
        mae: 0,
        mapePct: forecast.explanation.backtestMapePct ?? 0,
        withinBandPct: 0,
        sampleSize: forecast.explanation.sampleSize
      })
    )
  );
}
