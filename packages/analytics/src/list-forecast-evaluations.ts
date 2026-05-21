import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { ForecastEvaluationListResult } from "@fleetmind/shared/contracts/predictions.js";

export interface ListForecastEvaluationsQuery {
  limit?: number;
  metricKey?: string;
  scopeType?: "fleet" | "segment" | "vehicle";
  scopeKey?: string;
}

export async function listForecastEvaluations(
  tenantId: string,
  repositories: TenantRepositorySet,
  query: ListForecastEvaluationsQuery = {}
): Promise<ForecastEvaluationListResult> {
  const repo = repositories.forecastEvaluations;
  if (!repo) {
    return { tenantId, evaluations: [] };
  }

  const rows = await repo.listRecent({
    limit: query.limit ?? 30,
    evaluationKind: "holdout",
    ...(query.metricKey ? { metricKey: query.metricKey } : {}),
    ...(query.scopeType ? { scopeType: query.scopeType } : {}),
    ...(query.scopeKey ? { scopeKey: query.scopeKey } : {})
  });

  return {
    tenantId,
    evaluations: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      scopeType: row.scopeType,
      scopeKey: row.scopeKey,
      metricKey: row.metricKey as ForecastEvaluationListResult["evaluations"][number]["metricKey"],
      algorithm: row.algorithm as ForecastEvaluationListResult["evaluations"][number]["algorithm"],
      trainedUntil: row.trainedUntil,
      horizonDays: row.horizonDays,
      mae: row.mae,
      mapePct: row.mapePct,
      withinBandPct: row.withinBandPct,
      sampleSize: row.sampleSize,
      createdAt: row.createdAt,
      evaluationKind: row.evaluationKind
    }))
  };
}
