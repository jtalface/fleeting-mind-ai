import {
  createOpenAiNarrator,
  isOpenAiConfigured
} from "../../../packages/ai-core/src/openai-responder.js";
import { enforceGroundedResponse } from "../../../packages/ai-core/src/grounding.js";
import type { CopilotGroundingPayload, CopilotResponse } from "../../../packages/shared/src/contracts/ai.js";
import { buildDeterministicGroundedResponse } from "./grounded-responder.js";

export type CopilotResponderFn = (
  payload: CopilotGroundingPayload,
  history: string[]
) => Promise<CopilotResponse>;

export function createCopilotResponder(env: NodeJS.ProcessEnv = process.env): CopilotResponderFn {
  const deterministic: CopilotResponderFn = async (payload) => ({
    ...buildDeterministicGroundedResponse(payload),
    narrator: "deterministic"
  });

  if (!isOpenAiConfigured(env)) {
    if (env.NODE_ENV === "development") {
      console.warn("[api] OPENAI_API_KEY not set — chat uses deterministic narrator.");
    }
    return deterministic;
  }

  const model = env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const narrator = createOpenAiNarrator({
    apiKey: env.OPENAI_API_KEY!.trim(),
    model
  });

  if (env.NODE_ENV === "development") {
    console.info(`[api] Chat narrator: OpenAI (${model})`);
  }

  return async (payload, history) => {
    const base = buildDeterministicGroundedResponse(payload);

    if (base.citedFacts.length === 0) {
      return { ...base, narrator: "deterministic" };
    }

    try {
      const prose = await narrator(payload, base, history);
      const narrated: CopilotResponse = {
        ...base,
        answer: prose.answer,
        // Keep tool-grounded recommendations; OpenAI often invents thresholds (e.g. "below 40%").
        recommendations: base.recommendations,
        narrator: "openai"
      };

      try {
        enforceGroundedResponse(payload, narrated);
        return narrated;
      } catch (groundingError) {
        const detail =
          groundingError instanceof Error ? groundingError.message : String(groundingError);
        if (env.NODE_ENV === "development") {
          console.warn(
            `[api] OpenAI narrator failed grounding (${detail}), using deterministic fallback.`
          );
        }
        return { ...base, narrator: "deterministic" };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (env.NODE_ENV === "development") {
        console.warn(`[api] OpenAI narrator failed (${detail}), using deterministic fallback.`);
      }
      return { ...base, narrator: "deterministic" };
    }
  };
}
