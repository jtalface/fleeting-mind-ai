import type { EvaluationTrendPoint, EvaluationTrendsResult } from "@fleetmind/shared/contracts/predictions.js";
import type { ForecastEvaluationKind, TenantRepositorySet } from "../../database/src/repositories/contracts.js";

export interface ListEvaluationTrendsQuery {
  limit?: number;
  evaluationKind?: ForecastEvaluationKind;
}

export async function listEvaluationTrends(
  tenantId: string,
  repositories: TenantRepositorySet,
  query: ListEvaluationTrendsQuery = {}
): Promise<EvaluationTrendsResult> {
  const repo = repositories.forecastEvaluations;
  if (!repo?.listTrends) {
    return { tenantId, series: [] };
  }

  const rows = await repo.listTrends({
    limit: query.limit ?? 60,
    ...(query.evaluationKind ? { evaluationKind: query.evaluationKind } : {})
  });

  const bySeries = new Map<string, EvaluationTrendPoint[]>();

  for (const row of rows) {
    const key = [row.scopeType, row.scopeKey, row.metricKey, row.evaluationKind].join("|");
    const points = bySeries.get(key) ?? [];
    points.push({
      scoredAt: row.createdAt,
      evaluationKind: row.evaluationKind,
      mapePct: row.mapePct,
      withinBandPct: row.withinBandPct,
      trainedUntil: row.trainedUntil
    });
    bySeries.set(key, points);
  }

  const series = [...bySeries.entries()].map(([key, points]) => {
    const [scopeType, scopeKey, metricKey, evaluationKind] = key.split("|");
    const sorted = [...points].sort((a, b) => a.scoredAt.localeCompare(b.scoredAt));
    return {
      scopeType: scopeType as EvaluationTrendsResult["series"][number]["scopeType"],
      scopeKey: scopeKey ?? "",
      metricKey: metricKey as EvaluationTrendsResult["series"][number]["metricKey"],
      evaluationKind: evaluationKind as ForecastEvaluationKind,
      points: sorted
    };
  });

  return { tenantId, series };
}
