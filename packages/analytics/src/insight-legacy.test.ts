import { describe, expect, it } from "vitest";
import {
  filterLegacyRuleBasedInsights,
  isLegacyRuleBasedInsightId,
  mergeInsightsForDisplay
} from "./insight-legacy.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";

const sample = (id: string): Insight => ({
  id,
  tenantId: "tenant_demo",
  entityType: "fleet",
  entityId: "tenant_demo",
  severity: "info",
  title: "t",
  description: "d",
  supportingMetrics: [],
  recommendation: "r",
  confidence: 0.9,
  createdAt: "2026-05-21T00:00:00.000Z"
});

describe("insight-legacy", () => {
  it("detects legacy rule-based ids", () => {
    expect(isLegacyRuleBasedInsightId("insight_idle_v1")).toBe(true);
    expect(isLegacyRuleBasedInsightId("insight_fleet_activity")).toBe(true);
    expect(isLegacyRuleBasedInsightId("insight_fuel_v2")).toBe(true);
    expect(isLegacyRuleBasedInsightId("insight_llm_1_0")).toBe(false);
  });

  it("merges fresh insights ahead of filtered history", () => {
    const fresh = [sample("insight_llm_2_0")];
    const history = [sample("insight_llm_1_0"), sample("insight_idle_v1"), sample("insight_fleet_activity")];
    const merged = mergeInsightsForDisplay(fresh, history, 10);
    expect(merged.map((i) => i.id)).toEqual(["insight_llm_2_0", "insight_llm_1_0"]);
  });

  it("filterLegacyRuleBasedInsights removes legacy rows only", () => {
    const filtered = filterLegacyRuleBasedInsights([
      sample("insight_llm_1_0"),
      sample("insight_idle_v1")
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("insight_llm_1_0");
  });
});
