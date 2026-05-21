import type { Insight } from "@fleetmind/shared/contracts/domain.js";

/** Stable ids from {@link generateRuleBasedInsights} before LLM insights shipped. */
const LEGACY_RULE_INSIGHT_ID_PREFIXES = ["insight_idle_", "insight_fuel_"] as const;

const LEGACY_RULE_INSIGHT_EXACT_IDS = ["insight_fleet_profit", "insight_fleet_activity"] as const;

export function isLegacyRuleBasedInsightId(id: string): boolean {
  if (id.startsWith("insight_llm_")) {
    return false;
  }
  if (LEGACY_RULE_INSIGHT_EXACT_IDS.includes(id as (typeof LEGACY_RULE_INSIGHT_EXACT_IDS)[number])) {
    return true;
  }
  return LEGACY_RULE_INSIGHT_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function filterLegacyRuleBasedInsights(insights: Insight[]): Insight[] {
  return insights.filter((item) => !isLegacyRuleBasedInsightId(item.id));
}

/** Fresh batch first, then recent history without legacy rule rows or duplicate ids. */
export function mergeInsightsForDisplay(
  persisted: Insight[],
  historical: Insight[],
  limit = 50,
  options: { excludeLegacyRuleBased?: boolean } = {}
): Insight[] {
  const excludeLegacy = options.excludeLegacyRuleBased ?? true;
  const history = excludeLegacy ? filterLegacyRuleBasedInsights(historical) : historical;
  const freshIds = new Set(persisted.map((item) => item.id));
  return [...persisted, ...history.filter((item) => !freshIds.has(item.id))].slice(0, limit);
}

export function insightsIncludeLlmBatch(insights: Insight[]): boolean {
  return insights.some((item) => item.id.startsWith("insight_llm_"));
}
