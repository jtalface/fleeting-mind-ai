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
});
