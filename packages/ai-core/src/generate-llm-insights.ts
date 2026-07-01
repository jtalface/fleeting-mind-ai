import type { InsightGenerator } from "../../analytics/src/contracts.js";
import { generateRuleBasedInsights } from "../../analytics/src/insights.js";
import type { KpiSnapshot } from "@fleetmind/shared/contracts/analytics.js";
import type { Insight, MetricValue } from "@fleetmind/shared/contracts/domain.js";
import { z } from "zod";
import { isOpenAiConfigured, type OpenAiResponderOptions, openAiTemperature } from "./openai-responder.js";

/** gpt-5* models often omit optional-looking fields; coerce with defaults after parse. */
const llmInsightDraftLooseSchema = z.object({
  entityType: z.enum(["fleet", "vehicle"]),
  entityId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  recommendation: z.string().optional(),
  confidence: z.coerce.number().optional(),
  supportingMetricKeys: z
    .union([z.array(z.string()), z.string()])
    .optional()
});

const llmInsightsResponseLooseSchema = z.object({
  insights: z.array(llmInsightDraftLooseSchema).min(1).max(10)
});

type LlmInsightDraftLoose = z.infer<typeof llmInsightDraftLooseSchema>;

function inferSeverity(draft: LlmInsightDraftLoose): Insight["severity"] {
  if (draft.severity) {
    return draft.severity;
  }
  const text = `${draft.title} ${draft.description}`.toLowerCase();
  if (text.includes("critical") || text.includes("loss") || text.includes("urgent")) {
    return "critical";
  }
  if (text.includes("warning") || text.includes("high idle") || text.includes("above target")) {
    return "warning";
  }
  return "info";
}

function normalizeLooseDraft(draft: LlmInsightDraftLoose): z.infer<typeof llmInsightDraftLooseSchema> & {
  severity: Insight["severity"];
  recommendation: string;
  confidence: number;
  supportingMetricKeys: string[];
} {
  const keysRaw = draft.supportingMetricKeys;
  const supportingMetricKeys = Array.isArray(keysRaw)
    ? keysRaw
    : typeof keysRaw === "string"
      ? keysRaw.split(/[,\s]+/).filter(Boolean)
      : ["idle_ratio_pct"];

  return {
    ...draft,
    severity: inferSeverity(draft),
    recommendation:
      draft.recommendation?.trim() ||
      "Review the cited metrics and adjust dispatch or maintenance priorities for this asset.",
    confidence:
      typeof draft.confidence === "number" && Number.isFinite(draft.confidence)
        ? Math.min(1, Math.max(0, draft.confidence))
        : 0.82,
    supportingMetricKeys: supportingMetricKeys.length > 0 ? supportingMetricKeys : ["idle_ratio_pct"]
  };
}

const insightId = (index: number): string =>
  `insight_llm_${Date.now()}_${index}`;

const METRIC_KEY_ALIASES: Record<string, MetricValue["metricKey"]> = {
  revenue: "revenue",
  cost: "cost",
  profit: "profit",
  profit_margin: "profit_margin_pct",
  profit_margin_pct: "profit_margin_pct",
  fuel_cost_per_km: "fuel_cost_per_km",
  idle_ratio: "idle_ratio_pct",
  idle_ratio_pct: "idle_ratio_pct",
  utilization: "utilization_pct",
  utilization_pct: "utilization_pct",
  on_time_pct: "on_time_pct"
};

function normalizeMetricKeys(keys: string[], available: MetricValue[]): MetricValue["metricKey"][] {
  const allowed = new Set(available.map((m) => m.metricKey));
  const normalized: MetricValue["metricKey"][] = [];
  for (const key of keys) {
    const candidate = METRIC_KEY_ALIASES[key.trim()] ?? (key.trim() as MetricValue["metricKey"]);
    if (allowed.has(candidate)) {
      normalized.push(candidate);
    }
  }
  return [...new Set(normalized)];
}

function metricsForEntity(
  snapshot: KpiSnapshot,
  entityType: Insight["entityType"],
  entityId: string
): MetricValue[] {
  if (entityType === "fleet") {
    return snapshot.fleetMetrics;
  }
  const vehicle = snapshot.vehicleMetrics.find((row) => row.vehicleId === entityId);
  return vehicle?.metrics ?? [];
}

function attachSupportingMetrics(
  snapshot: KpiSnapshot,
  draft: ReturnType<typeof normalizeLooseDraft>,
  index: number
): Insight | null {
  const available = metricsForEntity(snapshot, draft.entityType, draft.entityId);
  if (available.length === 0) {
    return null;
  }

  const normalizedKeys = normalizeMetricKeys(draft.supportingMetricKeys, available);
  if (normalizedKeys.length === 0) {
    return null;
  }

  const keySet = new Set(normalizedKeys);
  const supportingMetrics = available.filter((metric) => keySet.has(metric.metricKey));

  return {
    id: insightId(index),
    tenantId: snapshot.tenantId,
    entityType: draft.entityType,
    entityId: draft.entityId,
    severity: draft.severity,
    title: draft.title.trim(),
    description: draft.description.trim(),
    recommendation: draft.recommendation.trim(),
    confidence: Math.round(draft.confidence * 100) / 100,
    supportingMetrics,
    createdAt: snapshot.generatedAt
  };
}

/** Keep prompt size bounded so OpenAI responds reliably for large fleets. */
function buildFactsPayload(snapshot: KpiSnapshot, context?: Parameters<InsightGenerator>[1]): string {
  const byRevenue = [...snapshot.vehicleMetrics].sort(
    (a, b) =>
      (b.metrics.find((m) => m.metricKey === "revenue")?.value ?? 0) -
      (a.metrics.find((m) => m.metricKey === "revenue")?.value ?? 0)
  );
  const byIdle = [...snapshot.vehicleMetrics].sort(
    (a, b) =>
      (b.metrics.find((m) => m.metricKey === "idle_ratio_pct")?.value ?? 0) -
      (a.metrics.find((m) => m.metricKey === "idle_ratio_pct")?.value ?? 0)
  );
  const selectedIds = new Set<string>();
  for (const row of [...byRevenue.slice(0, 8), ...byIdle.slice(0, 8)]) {
    selectedIds.add(row.vehicleId);
  }

  const vehicles = snapshot.vehicleMetrics
    .filter((row) => selectedIds.has(row.vehicleId))
    .map((row) => ({
      vehicleId: row.vehicleId,
      metrics: row.metrics
    }));

  return JSON.stringify(
    {
      tenantId: snapshot.tenantId,
      window: snapshot.metricWindow,
      fleetMetrics: snapshot.fleetMetrics,
      vehicles,
      vehicleCountTotal: snapshot.vehicleMetrics.length,
      forecasts: context?.forecasts ?? [],
      analyticsNote: context?.analyticsNote
    },
    null,
    2
  );
}

export async function generateLlmInsights(
  options: OpenAiResponderOptions,
  snapshot: KpiSnapshot,
  context?: Parameters<InsightGenerator>[1]
): Promise<Insight[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

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
        ...openAiTemperature(options.model, 0.25),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are Fleet Mind AI generating operational insights for a fleet manager.",
              'Respond JSON only: {"insights":[{"entityType":"fleet|vehicle","entityId":"...","severity":"info|warning|critical","title":"...","description":"...","recommendation":"...","confidence":0.0-1.0,"supportingMetricKeys":["metric_key"]}]}',
              "Each insight MUST include severity, recommendation, confidence, and supportingMetricKeys.",
              "Each insight must use ONLY numbers and metric keys present in fleet_facts.",
              "entityType fleet → entityId must equal tenantId from fleet_facts.",
              "entityType vehicle → entityId must be a vehicleId from fleet_facts.vehicles.",
              "supportingMetricKeys must use exact keys from fleet_facts (e.g. idle_ratio_pct, utilization_pct, profit).",
              "Write 3–8 concise, actionable insights mixing fleet-wide and per-vehicle findings when data supports it.",
              "Do not invent vehicles, trips, or metrics. If profit is negative, call it out. Flag high idle or fuel cost when present."
            ].join(" ")
          },
          {
            role: "user",
            content: `fleet_facts:\n${buildFactsPayload(snapshot, context)}`
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

    const parsed = llmInsightsResponseLooseSchema.parse(JSON.parse(content));
    const insights = parsed.insights
      .map((draft, index) => attachSupportingMetrics(snapshot, normalizeLooseDraft(draft), index))
      .filter((item): item is Insight => item !== null);

    if (insights.length === 0) {
      throw new Error(
        `LLM insights failed metric attachment validation (${parsed.insights.length} draft(s) rejected).`
      );
    }

    return insights;
  } finally {
    clearTimeout(timeout);
  }
}

export function createInsightGenerator(env: NodeJS.ProcessEnv = process.env): InsightGenerator {
  if (!isOpenAiConfigured(env)) {
    if (env.NODE_ENV === "development") {
      console.warn("[api] Insights: rule-based (OPENAI_API_KEY not set).");
    }
    return async (snapshot) => generateRuleBasedInsights(snapshot);
  }

  const model = env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const llmOptions: OpenAiResponderOptions = {
    apiKey: env.OPENAI_API_KEY!.trim(),
    model
  };

  if (env.NODE_ENV === "development") {
    console.info(`[api] Insights: LLM (${model})`);
  }

  return async (snapshot, context) => {
    try {
      const insights = await generateLlmInsights(llmOptions, snapshot, context);
      if (env.NODE_ENV === "development") {
        console.info(`[api] LLM insights generated: ${insights.length}`);
      }
      return insights;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`[ai-core] LLM insights failed (${detail}), using rule-based fallback.`);
      return generateRuleBasedInsights(snapshot);
    }
  };
}
