import type {
  CopilotResponse,
  ToolContext,
  ToolName,
  ToolRequest,
  ToolResult
} from "@fleetmind/shared/contracts/ai.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";
import type { ConversationMemory } from "./memory.js";
import { buildGroundingPayload, enforceGroundedResponse } from "./grounding.js";
import type { ToolRegistry } from "./tool-registry.js";

export interface ExecutionPlanStep {
  toolName: ToolName;
  reason: string;
  input: Record<string, unknown>;
}

export interface ExecutionPlan {
  steps: ExecutionPlanStep[];
}

export interface OrchestratorRequest {
  conversationId: string;
  question: string;
  context: ToolContext;
}

export interface OrchestratorDependencies {
  registry: ToolRegistry;
  memory: ConversationMemory;
  responder: (payload: ReturnType<typeof buildGroundingPayload>, history: string[]) => Promise<CopilotResponse>;
}

export class AgentOrchestrator {
  constructor(private readonly deps: OrchestratorDependencies) {}

  public createPlan(question: string): ExecutionPlan {
    const normalized = question.toLowerCase();
    const steps: ExecutionPlanStep[] = [];

    if (includesAny(normalized, ["profit", "margin", "revenue", "cost"])) {
      steps.push({
        toolName: "get_profitability_summary",
        reason: "Question asks for business profitability metrics.",
        input: {}
      });
    }
    if (includesAny(normalized, ["utilization", "idle", "efficiency"])) {
      steps.push({
        toolName: "get_operational_efficiency",
        reason: "Question asks for efficiency-related metrics.",
        input: {}
      });
    }
    if (includesAny(normalized, ["forecast", "predict", "tomorrow", "next"])) {
      steps.push({
        toolName: "get_forecast",
        reason: "Question asks for a future projection.",
        input: { horizonDays: 7 }
      });
    }
    if (includesAny(normalized, ["maintenance", "repair", "inspection"])) {
      steps.push({
        toolName: "list_open_maintenance",
        reason: "Question asks for maintenance status.",
        input: {}
      });
    }
    if (includesAny(normalized, ["insight", "alert", "anomal", "issue", "warning"])) {
      steps.push({
        toolName: "list_recent_insights",
        reason: "Question asks about generated fleet insights.",
        input: {}
      });
    }
    if (includesAny(normalized, ["sweeper", "vehicle", "fleet", "truck", "device"])) {
      steps.push({
        toolName: "get_vehicle_snapshot",
        reason: "Question asks about fleet or vehicle state.",
        input: {}
      });
    }

    if (steps.length === 0) {
      steps.push(
        {
          toolName: "get_profitability_summary",
          reason: "Default KPI context for grounded answers.",
          input: {}
        },
        {
          toolName: "list_recent_insights",
          reason: "Default insight context for grounded answers.",
          input: {}
        }
      );
    }

    return { steps };
  }

  public async runTurn(request: OrchestratorRequest, insights: Insight[] = []): Promise<CopilotResponse> {
    const historyTurns = await this.deps.memory.getRecent(request.context.tenantId, request.conversationId);
    const history = historyTurns.map((turn) => `${turn.role}: ${turn.content}`);
    const plan = this.createPlan(request.question);
    const toolResults = await this.executePlan(plan, request.context);
    const groundingPayload = buildGroundingPayload(request.question, toolResults, insights);
    const rawResponse = await this.deps.responder(groundingPayload, history);
    const validated = enforceGroundedResponse(groundingPayload, rawResponse);

    await this.deps.memory.append(request.context.tenantId, request.conversationId, {
      role: "user",
      content: request.question,
      createdAt: request.context.now
    });
    await this.deps.memory.append(request.context.tenantId, request.conversationId, {
      role: "assistant",
      content: validated.answer,
      createdAt: request.context.now
    });

    return validated;
  }

  private async executePlan(plan: ExecutionPlan, context: ToolContext): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (const step of plan.steps) {
      const request: ToolRequest = {
        toolName: step.toolName,
        input: step.input,
        context
      };
      results.push(await this.deps.registry.execute(request));
    }
    return results;
  }
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}
