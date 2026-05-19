import type { CopilotGroundingPayload, CopilotResponse, ToolResult } from "@fleetmind/shared/contracts/ai.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";

const NUMBER_REGEX = /-?\d+(?:\.\d+)?/g;

export function buildGroundingPayload(
  question: string,
  toolResults: ToolResult[],
  insights: Insight[] = [],
  assumptions: string[] = []
): CopilotGroundingPayload {
  return {
    question,
    toolResults,
    insights,
    assumptions,
    guardrails: [
      "Only claim numbers present in tool results.",
      "Every numeric claim must be represented in citedFacts.",
      "Each cited fact must reference a citation emitted by the matched tool."
    ]
  };
}

export function enforceGroundedResponse(
  payload: CopilotGroundingPayload,
  response: CopilotResponse
): CopilotResponse {
  if (response.confidence < 0 || response.confidence > 1) {
    throw new Error("Response confidence must be between 0 and 1.");
  }

  const allowedNumbers = collectAllowedNumbers(payload.toolResults);
  const citedNumbers = new Set(
    response.citedFacts.flatMap((fact) => extractNumbers(fact.claim)).map((value) => normalizeNumber(value))
  );

  for (const fact of response.citedFacts) {
    const toolResult = payload.toolResults.find((result) => result.toolName === fact.toolName);
    if (!toolResult) {
      throw new Error(`Cited tool ${fact.toolName} was not executed for this response.`);
    }

    if (!toolResult.citations.includes(fact.citation)) {
      throw new Error(`Citation ${fact.citation} is not valid for tool ${fact.toolName}.`);
    }

    const factNumbers = extractNumbers(fact.claim);
    for (const value of factNumbers) {
      const normalized = normalizeNumber(value);
      if (!allowedNumbers.has(normalized)) {
        throw new Error(`Cited claim includes unsupported numeric value ${value}.`);
      }
    }
  }

  const answerNumbers = [
    ...extractNumbers(response.answer),
    ...response.recommendations.flatMap((recommendation) => extractNumbers(recommendation))
  ].map((value) => normalizeNumber(value));

  if (answerNumbers.length > 0 && response.citedFacts.length === 0) {
    throw new Error("Numeric responses must include cited facts.");
  }

  for (const numberToken of answerNumbers) {
    if (!allowedNumbers.has(numberToken)) {
      throw new Error(`Response includes fabricated numeric value ${numberToken}.`);
    }
    if (!citedNumbers.has(numberToken)) {
      throw new Error(`Numeric value ${numberToken} is missing from cited facts.`);
    }
  }

  return response;
}

function collectAllowedNumbers(toolResults: ToolResult[]): Set<string> {
  const values: string[] = [];
  for (const result of toolResults) {
    if (result.data !== undefined) {
      extractNumericValues(result.data, values);
    }
  }
  return new Set(values.map((value) => normalizeNumber(value)));
}

function extractNumericValues(value: unknown, bucket: string[]): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    bucket.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractNumericValues(item, bucket);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      extractNumericValues(nestedValue, bucket);
    }
  }
}

function extractNumbers(text: string): string[] {
  return text.match(NUMBER_REGEX) ?? [];
}

function normalizeNumber(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return parsed.toString();
}
