import type { PredictionsListResult } from "@fleetmind/shared/contracts/predictions.js";
import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";
import { bundlesFromRuns } from "./persist-predictions.js";

export interface ListPredictionsQuery {
  horizonDays: number;
  scopeType?: "fleet" | "segment";
  scopeKey?: string;
  metricKey?: string;
}

export async function listCachedPredictions(
  tenantId: string,
  repositories: TenantRepositorySet,
  query: ListPredictionsQuery,
  generatedAt: string
): Promise<PredictionsListResult> {
  const repo = repositories.predictionRuns;
  if (!repo) {
    return { tenantId, horizonDays: query.horizonDays, bundles: [], generatedAt };
  }

  const runs = await repo.listLatest({
    horizonDays: query.horizonDays,
    ...(query.scopeType ? { scopeType: query.scopeType } : {}),
    ...(query.scopeKey ? { scopeKey: query.scopeKey } : {}),
    ...(query.metricKey ? { metricKey: query.metricKey } : {})
  });

  return {
    tenantId,
    horizonDays: query.horizonDays,
    bundles: bundlesFromRuns(runs),
    generatedAt
  };
}
