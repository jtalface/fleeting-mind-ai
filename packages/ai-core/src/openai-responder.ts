import type { CopilotGroundingPayload, CopilotResponse } from "@fleetmind/shared/contracts/ai.js";
import { z } from "zod";

const copilotResponseSchema = z.object({
  answer: z.string().min(1),
  recommendations: z.array(z.string()),
  citedFacts: z.array(
    z.object({
      claim: z.string().min(1),
      toolName: z.string().min(1),
      citation: z.string().min(1)
    })
  ),
  confidence: z.number().min(0).max(1),
  needsFollowUp: z.boolean()
});

export interface OpenAiResponderOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

const PLACEHOLDER_KEYS = new Set(["replace-me", "your-openai-key"]);

/** gpt-5* models only support the default temperature; omit the param to avoid 400 errors. */
function openAiTemperature(model: string, value: number): { temperature?: number } {
  if (/^gpt-5/i.test(model)) {
    return {};
  }
  return { temperature: value };
}

export function isOpenAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const key = env.OPENAI_API_KEY?.trim();
  return Boolean(key && !PLACEHOLDER_KEYS.has(key));
}

const narrativeSchema = z.object({
  answer: z.string().min(1),
  recommendations: z.array(z.string())
});

/** Rewrites prose only; citedFacts must come from the deterministic base. */
export function createOpenAiNarrator(
  options: OpenAiResponderOptions
): (
  payload: CopilotGroundingPayload,
  base: CopilotResponse,
  history: string[]
) => Promise<{ answer: string; recommendations: string[] }> {
  const timeoutMs = options.timeoutMs ?? 60_000;

  return async (payload, base, history) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const factLines = base.citedFacts.map((f, i) => `${i + 1}. ${f.claim}`).join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: options.model,
          ...openAiTemperature(options.model, 0.3),
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You are Fleet Mind AI. Rewrite the assistant reply in clear, conversational English.",
                'Respond JSON only: {"answer":"...","recommendations":[]}',
                "Always return an empty recommendations array.",
                "Use ONLY facts and numbers from CITED_FACTS below — copy numeric values exactly as written (keep percentage decimals as shown, typically one decimal place).",
                "Do not use thousands separators in numbers (write 17536 not 17,536). Do not invent vehicles, metrics, or counts.",
                "Answer the user's question directly in clear prose; do not repeat every cited line verbatim."
              ].join(" ")
            },
            ...history.slice(-4).map((line) => ({ role: "user" as const, content: line })),
            {
              role: "user",
              content: [
                `Question: ${payload.question}`,
                `CITED_FACTS:\n${factLines}`,
                payload.insights.length > 0
                  ? `INSIGHTS:\n${payload.insights.map((i) => `- ${i.title}: ${i.description}`).join("\n")}`
                  : ""
              ]
                .filter(Boolean)
                .join("\n\n")
            }
          ]
        })
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI API ${response.status}: ${body.slice(0, 300)}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty message.");
      }

      return narrativeSchema.parse(JSON.parse(content));
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function createOpenAiResponder(
  options: OpenAiResponderOptions
): (payload: CopilotGroundingPayload, history: string[]) => Promise<CopilotResponse> {
  const timeoutMs = options.timeoutMs ?? 60_000;

  return async (payload, history) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: options.model,
          ...openAiTemperature(options.model, 0.2),
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You are Fleet Mind AI, a fleet operations copilot.",
                "Respond with JSON only matching this shape:",
                '{"answer":"string","recommendations":["string"],"citedFacts":[{"claim":"string","toolName":"string","citation":"string"}],"confidence":0-1,"needsFollowUp":boolean}',
                "Use ONLY numbers present in tool_results or insights in the user message.",
                "Every number in answer or recommendations must also appear in a citedFacts.claim.",
                "Each citedFacts entry must use a toolName and citation that exist in tool_results.",
                "Prefer insights and KPIs from tool_results when answering."
              ].join(" ")
            },
            ...history.slice(-6).map((line) => ({ role: "user" as const, content: line })),
            {
              role: "user",
              content: JSON.stringify({
                question: payload.question,
                tool_results: payload.toolResults,
                insights: payload.insights,
                guardrails: payload.guardrails
              })
            }
          ]
        })
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI API ${response.status}: ${body.slice(0, 300)}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty message.");
      }

      const parsed = copilotResponseSchema.parse(JSON.parse(content));
      return parsed as CopilotResponse;
    } finally {
      clearTimeout(timeout);
    }
  };
}
