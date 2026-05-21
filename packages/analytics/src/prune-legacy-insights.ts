import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";
import { insightsIncludeLlmBatch } from "./insight-legacy.js";

export function shouldExcludeLegacyRuleBasedInsights(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export async function pruneLegacyRuleBasedInsights(
  repositories: TenantRepositorySet,
  generated?: Insight[]
): Promise<number> {
  if (!shouldExcludeLegacyRuleBasedInsights()) {
    return 0;
  }
  if (generated && !insightsIncludeLlmBatch(generated)) {
    return 0;
  }
  return repositories.insights.deleteLegacyRuleBased();
}
