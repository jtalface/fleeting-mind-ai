import { createOpenAiResponder, isOpenAiConfigured } from "../../../packages/ai-core/src/openai-responder.js";
import { enforceGroundedResponse } from "../../../packages/ai-core/src/grounding.js";
import type { CopilotGroundingPayload, CopilotResponse } from "../../../packages/shared/src/contracts/ai.js";
import { buildDeterministicGroundedResponse } from "./grounded-responder.js";

export type CopilotResponderFn = (
  payload: CopilotGroundingPayload,
  history: string[]
) => Promise<CopilotResponse>;

export function createCopilotResponder(env: NodeJS.ProcessEnv = process.env): CopilotResponderFn {
  const deterministic: CopilotResponderFn = async (payload) => buildDeterministicGroundedResponse(payload);

  if (!isOpenAiConfigured(env)) {
    return deterministic;
  }

  const openAi = createOpenAiResponder({
    apiKey: env.OPENAI_API_KEY!.trim(),
    model: env.LLM_MODEL ?? "gpt-4o-mini"
  });

  return async (payload, history) => {
    try {
      const raw = await openAi(payload, history);
      return enforceGroundedResponse(payload, raw);
    } catch (error) {
      if (env.NODE_ENV === "development") {
        console.warn("[api] OpenAI responder failed, using deterministic fallback:", error);
      }
      return deterministic(payload, history);
    }
  };
}
