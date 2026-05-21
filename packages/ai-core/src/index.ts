export interface AICorePackageBoundary {
  owns: ["tool_registry", "agent_orchestrator", "memory_policy", "grounding_pipeline"];
  exposes: ["run_copilot_turn", "register_tool", "validate_grounding"];
  mustNotImport: ["@fleetmind/database", "@fleetmind/web"];
}

export * from "./tool-registry.js";
export * from "./memory.js";
export * from "./grounding.js";
export * from "./orchestrator.js";
export * from "./openai-responder.js";
export * from "./generate-llm-insights.js";
