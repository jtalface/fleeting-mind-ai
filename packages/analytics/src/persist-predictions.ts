import type { DeterministicForecast, ForecastExplanation } from "@fleetmind/shared/contracts/analytics.js";
import type { PredictionBundle, PredictionScopeType } from "@fleetmind/shared/contracts/predictions.js";
import type {
  PredictionRunRecord,
  PredictionRunRepository,
  PredictionRunStored,
  TenantRepositorySet
} from "../../database/src/repositories/contracts.js";
import type { PredictionScopeDefinition } from "./prediction-scopes.js";
import type { ScopedForecastBatch } from "./run-batch-predictions.js";

function toRunRecord(
  scope: PredictionScopeDefinition,
  forecast: DeterministicForecast
): PredictionRunRecord {
  const explanation: ForecastExplanation = forecast.explanation;
  return {
    tenantId: forecast.tenantId,
    scopeType: scope.scopeType as PredictionScopeType,
    scopeKey: scope.scopeKey,
    ...(scope.scopeType === "vehicle" && scope.scopeLabel
      ? { nameIncludes: scope.scopeLabel }
      : scope.nameIncludes
        ? { nameIncludes: scope.nameIncludes }
        : {}),
    metricKey: forecast.metricKey,
    algorithm: explanation.algorithm,
    trainedUntil: forecast.trainedUntil,
    horizonDays: forecast.horizonDays,
    sampleSize: explanation.sampleSize,
    ...(explanation.backtestMapePct !== undefined ? { backtestMapePct: explanation.backtestMapePct } : {}),
    championSelected: explanation.championSelected ?? false,
    explanation,
    points: forecast.predictedPoints.map((point) => ({
      date: point.date,
      p10: point.p10,
      p50: point.p50,
      p90: point.p90
    }))
  };
}

export async function persistPredictionBatches(
  repositories: TenantRepositorySet,
  batches: ScopedForecastBatch[]
): Promise<PredictionRunStored[]> {
  const repo = repositories.predictionRuns;
  if (!repo) {
    return [];
  }

  const appended: PredictionRunStored[] = [];
  for (const batch of batches) {
    for (const forecast of batch.forecasts) {
      const stored = await repo.appendRun(toRunRecord(batch.scope, forecast));
      appended.push(stored);
    }
  }

  await repo.pruneOldRuns({ maxPerSeries: 24 });
  return appended;
}

export function bundlesFromRuns(
  runs: Awaited<ReturnType<PredictionRunRepository["listLatest"]>>
): PredictionBundle[] {
  return runs.map((run) => ({
    tenantId: run.tenantId,
    scopeType: run.scopeType,
    scopeKey: run.scopeKey,
    ...(run.scopeType === "vehicle" && run.nameIncludes ? { scopeLabel: run.nameIncludes } : {}),
    ...(run.scopeType === "segment" && run.nameIncludes ? { nameIncludes: run.nameIncludes } : {}),
    metricKey: run.metricKey as DeterministicForecast["metricKey"],
    trainedUntil: run.trainedUntil,
    horizonDays: run.horizonDays,
    predictedPoints: run.points.map((point) => ({
      date: point.date,
      p10: point.p10,
      p50: point.p50,
      p90: point.p90,
      value: point.p50,
      lowerBound: point.p10,
      upperBound: point.p90
    })),
    explanation: run.explanation,
    cachedAt: run.createdAt
  }));
}
