import { describe, expect, it } from "vitest";
import type { CopilotResponse, ToolContext } from "@fleetmind/shared/contracts/ai.js";
import { buildGroundingPayload, enforceGroundedResponse } from "./grounding.js";
import { InMemoryConversationMemory } from "./memory.js";
import { AgentOrchestrator } from "./orchestrator.js";
import { ToolRegistry } from "./tool-registry.js";

const context: ToolContext = {
  tenantId: "tenant_1",
  requestId: "req_1",
  userId: "user_1",
  now: "2026-05-07T00:00:00.000Z"
};

describe("grounding enforcement", () => {
  it("accepts a fully grounded numeric response", () => {
    const payload = buildGroundingPayload("What is profit?", [
      {
        toolName: "get_profitability_summary",
        ok: true,
        observedAt: context.now,
        citations: ["profitability:2026-05-07"],
        data: { profit: 1200, margin: 24.5 }
      }
    ]);

    const response: CopilotResponse = {
      answer: "Your current profit is 1200.",
      recommendations: ["Keep margin above 24.5 to protect profitability."],
      citedFacts: [
        {
          claim: "Profit is 1200 and margin is 24.5.",
          toolName: "get_profitability_summary",
          citation: "profitability:2026-05-07"
        }
      ],
      confidence: 0.82,
      needsFollowUp: false
    };

    expect(enforceGroundedResponse(payload, response)).toEqual(response);
  });

  it("rejects fabricated numeric claims", () => {
    const payload = buildGroundingPayload("What is profit?", [
      {
        toolName: "get_profitability_summary",
        ok: true,
        observedAt: context.now,
        citations: ["profitability:2026-05-07"],
        data: { profit: 1200 }
      }
    ]);

    const response: CopilotResponse = {
      answer: "Your current profit is 1300.",
      recommendations: [],
      citedFacts: [
        {
          claim: "Profit is 1200.",
          toolName: "get_profitability_summary",
          citation: "profitability:2026-05-07"
        }
      ],
      confidence: 0.8,
      needsFollowUp: false
    };

    expect(() => enforceGroundedResponse(payload, response)).toThrow(/fabricated numeric value/i);
  });
});

describe("agent orchestrator", () => {
  it("uses registry tools and blocks fabricated responses", async () => {
    const registry = new ToolRegistry();
    const memory = new InMemoryConversationMemory();

    registry.register("get_profitability_summary", async (request) => ({
      toolName: request.toolName,
      ok: true,
      observedAt: context.now,
      citations: ["profitability:2026-05-07"],
      data: { profit: 1200 }
    }));

    const orchestrator = new AgentOrchestrator({
      registry,
      memory,
      responder: async () => ({
        answer: "Profit is 1300.",
        recommendations: [],
        citedFacts: [
          {
            claim: "Profit is 1200.",
            toolName: "get_profitability_summary",
            citation: "profitability:2026-05-07"
          }
        ],
        confidence: 0.7,
        needsFollowUp: true
      })
    });

    await expect(
      orchestrator.runTurn({
        conversationId: "conv_1",
        question: "What is our current profit?",
        context
      })
    ).rejects.toThrow(/fabricated numeric value/i);
  });

  it("accepts narrated answers with comma-separated thousands in trip counts", () => {
    const payload = buildGroundingPayload("trips?", [
      {
        toolName: "get_vehicle_group_metrics",
        ok: true,
        observedAt: context.now,
        citations: ["analytics:vehicle_group"],
        data: {
          matchedCount: 5,
          nameIncludes: "Sweeper",
          groupAvgIdleRatioPct: 42.9,
          groupAvgUtilizationPct: 57.1,
          vehicles: [{ label: "Sweeper 7301", idleRatioPct: 33.5, tripCount: 17536 }]
        }
      }
    ]);

    const response: CopilotResponse = {
      answer:
        "You have 5 sweepers (~43% avg idle). Sweeper 7301 logged 17,536 trips at 33.5% idle.",
      recommendations: [],
      citedFacts: [
        {
          claim:
            'Vehicles matching "Sweeper": 5 units. Group average idle ratio is 42.9% and utilization is 57.1% (trip-based, analysis window).',
          toolName: "get_vehicle_group_metrics",
          citation: "analytics:vehicle_group"
        },
        {
          claim: "Sweeper 7301: idle ratio 33.5% across 17536 trip(s).",
          toolName: "get_vehicle_group_metrics",
          citation: "analytics:vehicle_group"
        }
      ],
      confidence: 0.86,
      needsFollowUp: false
    };

    expect(enforceGroundedResponse(payload, response)).toEqual(response);
  });

  it("accepts answer percentages rounded to one decimal vs stored metrics", () => {
    const payload = buildGroundingPayload("idle?", [
      {
        toolName: "get_vehicle_group_metrics",
        ok: true,
        observedAt: context.now,
        citations: ["analytics:vehicle_group"],
        data: {
          matchedCount: 5,
          nameIncludes: "Sweeper",
          groupAvgIdleRatioPct: 35.7143,
          groupAvgUtilizationPct: 64.2857,
          vehicles: []
        }
      }
    ]);

    const response: CopilotResponse = {
      answer: "You have 5 sweepers with about 35.7% average idle time.",
      recommendations: [],
      citedFacts: [
        {
          claim:
            'Vehicles matching "Sweeper": 5 units. Group average idle ratio is 35.7% and utilization is 64.3% (trip-based, analysis window).',
          toolName: "get_vehicle_group_metrics",
          citation: "analytics:vehicle_group"
        }
      ],
      confidence: 0.86,
      needsFollowUp: false
    };

    expect(enforceGroundedResponse(payload, response)).toEqual(response);
  });

  it("accepts digits embedded in vehicle labels from tool string fields", () => {
    const payload = buildGroundingPayload("Sweeper idle?", [
      {
        toolName: "get_vehicle_group_metrics",
        ok: true,
        observedAt: context.now,
        citations: ["analytics:vehicle_group"],
        data: {
          matchedCount: 5,
          nameIncludes: "Sweeper",
          groupAvgIdleRatioPct: 12,
          groupAvgUtilizationPct: 88,
          vehicles: [{ label: "SW-8092", idleRatioPct: 15, tripCount: 3 }]
        }
      }
    ]);

    const response: CopilotResponse = {
      answer: "SW-8092 has 15% idle across 3 trips.",
      recommendations: [],
      citedFacts: [
        {
          claim: "SW-8092: idle ratio 15% across 3 trip(s).",
          toolName: "get_vehicle_group_metrics",
          citation: "analytics:vehicle_group"
        }
      ],
      confidence: 0.86,
      needsFollowUp: false
    };

    expect(enforceGroundedResponse(payload, response)).toEqual(response);
  });

  it("accepts vehicle group metrics claims without hardcoded window day counts", () => {
    const payload = buildGroundingPayload("How many sweepers?", [
      {
        toolName: "get_vehicle_group_metrics",
        ok: true,
        observedAt: context.now,
        citations: ["analytics:vehicle_group"],
        data: {
          matchedCount: 5,
          nameIncludes: "Sweeper",
          groupAvgIdleRatioPct: 12.5,
          groupAvgUtilizationPct: 87.5,
          vehicles: []
        }
      }
    ]);

    const response: CopilotResponse = {
      answer: "You have 5 sweepers with 12.5% average idle time.",
      recommendations: [],
      citedFacts: [
        {
          claim:
            'Vehicles matching "Sweeper": 5 units. Group average idle ratio is 12.5% and utilization is 87.5% (trip-based, analysis window).',
          toolName: "get_vehicle_group_metrics",
          citation: "analytics:vehicle_group"
        }
      ],
      confidence: 0.86,
      needsFollowUp: false
    };

    expect(enforceGroundedResponse(payload, response)).toEqual(response);
  });

  it("plans vehicle group metrics for plate follow-up after sweeper context", () => {
    const registry = new ToolRegistry();
    const orchestrator = new AgentOrchestrator({
      registry,
      memory: new InMemoryConversationMemory(),
      responder: async () => ({
        answer: "ok",
        recommendations: [],
        citedFacts: [],
        confidence: 0.8,
        needsFollowUp: false
      })
    });

    const history = [
      "user: How many sweepers do we have?",
      "assistant: You have 5 sweepers with 42.9% average idle."
    ];
    const plan = orchestrator.createPlan("give me their plate numbers", history);
    expect(plan.steps.some((s) => s.toolName === "get_vehicle_group_metrics")).toBe(true);
    expect(plan.steps.find((s) => s.toolName === "get_vehicle_group_metrics")?.input).toEqual({
      nameIncludes: "Sweeper"
    });
    expect(plan.steps.some((s) => s.toolName === "get_vehicle_snapshot")).toBe(false);
  });

  it("plans vehicle group metrics when question mentions sweepers", () => {
    const registry = new ToolRegistry();
    const orchestrator = new AgentOrchestrator({
      registry,
      memory: new InMemoryConversationMemory(),
      responder: async () => ({
        answer: "ok",
        recommendations: [],
        citedFacts: [],
        confidence: 0.8,
        needsFollowUp: false
      })
    });

    const plan = orchestrator.createPlan("How many sweepers do we have and what is their idle time?");
    expect(plan.steps.some((s) => s.toolName === "get_vehicle_group_metrics")).toBe(true);
    expect(plan.steps.find((s) => s.toolName === "get_vehicle_group_metrics")?.input).toEqual({
      nameIncludes: "Sweeper"
    });
    expect(plan.steps.some((s) => s.toolName === "get_operational_efficiency")).toBe(false);
    expect(plan.steps.some((s) => s.toolName === "get_vehicle_snapshot")).toBe(false);
  });
});
