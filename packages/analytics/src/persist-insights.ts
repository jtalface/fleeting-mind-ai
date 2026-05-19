import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";

/**
 * Persists generated insights, skipping when the same deterministic insight id already exists recently.
 */
export async function persistInsights(
  repositories: TenantRepositorySet,
  insights: Insight[],
  options: { replaceExistingIds?: boolean } = { replaceExistingIds: true }
): Promise<Insight[]> {
  const recent = await repositories.insights.listRecent(200);
  const recentIds = new Set(recent.map((item) => item.id));
  const persisted: Insight[] = [];

  for (const insight of insights) {
    if (options.replaceExistingIds && recentIds.has(insight.id)) {
      continue;
    }
    const created = await repositories.insights.create({
      id: insight.id,
      entityType: insight.entityType,
      entityId: insight.entityId,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      supportingMetrics: insight.supportingMetrics,
      recommendation: insight.recommendation,
      confidence: insight.confidence
    });
    persisted.push(created);
    recentIds.add(insight.id);
  }

  return persisted;
}
