import type { KpiSnapshot } from "@fleetmind/shared/contracts/analytics.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateLlmInsights } from "./generate-llm-insights.js";

const snapshot: KpiSnapshot = {
  tenantId: "tenant_demo",
  generatedAt: "2026-05-14T12:00:00.000Z",
  timeframe: "custom",
  metricWindow: {
    start: "2026-05-07T00:00:00.000Z",
    end: "2026-05-14T12:00:00.000Z"
  },
  fleetMetrics: [
    {
      metricKey: "profit",
      value: -1200,
      unit: "currency",
      timeframe: "custom",
      asOf: "2026-05-14T12:00:00.000Z"
    },
    {
      metricKey: "idle_ratio_pct",
      value: 35.2,
      unit: "percent",
      timeframe: "custom",
      asOf: "2026-05-14T12:00:00.000Z"
    }
  ],
  vehicleMetrics: [
    {
      vehicleId: "veh_1",
      metrics: [
        {
          metricKey: "idle_ratio_pct",
          value: 42,
          unit: "percent",
          timeframe: "custom",
          asOf: "2026-05-14T12:00:00.000Z"
        }
      ]
    }
  ]
};

describe("generateLlmInsights", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps LLM JSON drafts to grounded Insight records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  insights: [
                    {
                      entityType: "fleet",
                      entityId: "tenant_demo",
                      severity: "critical",
                      title: "Fleet operating at a loss",
                      description: "Profit is -1200 in the analysis window.",
                      recommendation: "Cut idle time and rebalance routes.",
                      confidence: 0.9,
                      supportingMetricKeys: ["profit"]
                    },
                    {
                      entityType: "vehicle",
                      entityId: "veh_1",
                      severity: "warning",
                      title: "High idle on veh_1",
                      description: "Idle ratio is 42% for this vehicle.",
                      recommendation: "Review dispatch for veh_1.",
                      confidence: 0.85,
                      supportingMetricKeys: ["idle_ratio_pct"]
                    }
                  ]
                })
              }
            }
          ]
        })
      })
    );

    const insights = await generateLlmInsights(
      { apiKey: "test-key", model: "gpt-4o-mini" },
      snapshot
    );

    expect(insights).toHaveLength(2);
    expect(insights[0]?.id.startsWith("insight_llm_")).toBe(true);
    expect(insights[0]?.recommendation.length).toBeGreaterThan(0);
    expect(insights[0]?.supportingMetrics[0]?.metricKey).toBe("profit");
    expect(insights[1]?.entityId).toBe("veh_1");
  });
});
