import type { CopilotGroundingPayload, CopilotResponse, ToolResult } from "@fleetmind/shared/contracts/ai.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";

const NUMBER_REGEX = /-?\d+(?:\.\d+)?/g;
/** Max drift when comparing a rounded display value to a stored metric (e.g. 35.7 vs 35.7143). */
const METRIC_ROUNDING_EPSILON = 0.11;

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
  const citedNumbers = expandNumericTokens(
    response.citedFacts
      .flatMap((fact) => extractNumbers(fact.claim))
      .map((value) => normalizeNumber(value))
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
      if (!matchesGroundedNumber(normalized, allowedNumbers)) {
        throw new Error(`Cited claim includes unsupported numeric value ${value}.`);
      }
    }
  }

  // Only validate answer prose; recommendations are tool-grounded separately.
  const answerNumbers = extractNumbers(response.answer).map((value) => normalizeNumber(value));

  if (answerNumbers.length > 0 && response.citedFacts.length === 0) {
    throw new Error("Numeric responses must include cited facts.");
  }

  // Narrated prose may round metrics; allow numbers from cited facts OR tool output.
  for (const numberToken of answerNumbers) {
    if (
      !matchesGroundedNumber(numberToken, citedNumbers) &&
      !matchesGroundedNumber(numberToken, allowedNumbers)
    ) {
      throw new Error(`Response includes fabricated numeric value ${numberToken}.`);
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
  return expandNumericTokens(values.map((value) => normalizeNumber(value)));
}

function expandNumericTokens(values: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of values) {
    set.add(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      continue;
    }
    set.add(parsed.toFixed(1));
    set.add(parsed.toFixed(2));
    set.add(String(Math.round(parsed)));
  }
  return set;
}

function matchesGroundedNumber(value: string, pool: Set<string>): boolean {
  if (pool.has(value)) {
    return true;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  for (const candidate of pool) {
    const other = Number(candidate);
    if (!Number.isFinite(other)) {
      continue;
    }
    if (Math.abs(parsed - other) <= METRIC_ROUNDING_EPSILON) {
      return true;
    }
    if (parsed.toFixed(1) === other.toFixed(1)) {
      return true;
    }
  }

  return false;
}

function extractNumericValues(value: unknown, bucket: string[]): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    bucket.push(String(value));
    return;
  }

  if (typeof value === "string") {
    for (const match of value.match(NUMBER_REGEX) ?? []) {
      bucket.push(match);
    }
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

/** Strip thousands separators so "17,536" is read as 17536, not 17 and 536. */
function normalizeNumericText(text: string): string {
  return text.replace(/(?<=\d),(?=\d)/g, "");
}

function extractNumbers(text: string): string[] {
  return normalizeNumericText(text).match(NUMBER_REGEX) ?? [];
}

function normalizeNumber(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return parsed.toString();
}
