import type { CopilotGroundingPayload, CopilotResponse, ToolResult } from "../../../packages/shared/src/contracts/ai.js";
import type { DeterministicForecast, KpiSnapshot } from "../../../packages/shared/src/contracts/analytics.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKpiSnapshot(value: unknown): value is KpiSnapshot {
  return isRecord(value) && Array.isArray(value.fleetMetrics) && typeof value.tenantId === "string";
}

function fleetMetric(snapshot: KpiSnapshot, key: (typeof snapshot.fleetMetrics)[number]["metricKey"]): number | undefined {
  return snapshot.fleetMetrics.find((m) => m.metricKey === key)?.value;
}

function isEfficiencyRow(value: unknown): value is { utilizationPct?: number; idleRatioPct?: number } {
  return isRecord(value) && (typeof value.utilizationPct === "number" || typeof value.idleRatioPct === "number");
}

function isForecastList(value: unknown): value is DeterministicForecast[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  const first = value[0];
  return isRecord(first) && Array.isArray(first.predictedPoints);
}

function firstCitation(result: ToolResult): string {
  const citation = result.citations[0];
  if (!citation) {
    throw new Error(`Tool ${result.toolName} returned no citations.`);
  }
  return citation;
}

/**
 * Deterministic, grounding-safe copilot reply: every numeric token in the answer
 * and recommendations must appear in tool results and be repeated in citedFacts.
 */
export function buildDeterministicGroundedResponse(payload: CopilotGroundingPayload): CopilotResponse {
  const answerParts: string[] = [];
  const recommendations: string[] = [];
  const citedFacts: CopilotResponse["citedFacts"] = [];

  for (const result of payload.toolResults) {
    if (!result.ok || result.data === undefined) {
      continue;
    }

    switch (result.toolName) {
      case "get_profitability_summary": {
        if (!isKpiSnapshot(result.data)) {
          break;
        }
        const profit = fleetMetric(result.data, "profit");
        const margin = fleetMetric(result.data, "profit_margin_pct");
        const revenue = fleetMetric(result.data, "revenue");
        if (profit === undefined || margin === undefined) {
          break;
        }
        const profitStr = String(profit);
        const marginStr = String(margin);
        let sentence = `Fleet profit over the retrieved KPI window is ${profitStr} with a profit margin of ${marginStr}%.`;
        if (revenue !== undefined) {
          const revenueStr = String(revenue);
          sentence = `Fleet revenue is ${revenueStr}, profit is ${profitStr}, and profit margin is ${marginStr}%.`;
        }
        answerParts.push(sentence);
        citedFacts.push({
          claim: sentence,
          toolName: "get_profitability_summary",
          citation: firstCitation(result)
        });
        recommendations.push(
          `If profit margin stays near ${marginStr}%, prioritize routes and vehicles with the strongest contribution to profit.`
        );
        break;
      }
      case "get_operational_efficiency": {
        if (!isEfficiencyRow(result.data)) {
          break;
        }
        const { utilizationPct, idleRatioPct } = result.data;
        if (utilizationPct === undefined || idleRatioPct === undefined) {
          break;
        }
        const uStr = String(utilizationPct);
        const iStr = String(idleRatioPct);
        const sentence = `Latest efficiency benchmark shows utilization at ${uStr}% and idle ratio at ${iStr}%.`;
        answerParts.push(sentence);
        citedFacts.push({
          claim: sentence,
          toolName: "get_operational_efficiency",
          citation: firstCitation(result)
        });
        recommendations.push(`Target idle ratio below ${iStr}% where feasible without hurting service levels.`);
        break;
      }
      case "get_forecast": {
        if (!isForecastList(result.data)) {
          break;
        }
        const revenueForecast = result.data.find((f) => f.metricKey === "revenue") ?? result.data[0];
        const firstPoint = revenueForecast?.predictedPoints[0];
        if (!firstPoint) {
          break;
        }
        const vStr = String(firstPoint.value);
        const sentence = `Deterministic revenue forecast for the first horizon day is ${vStr} (${revenueForecast.metricKey}).`;
        answerParts.push(sentence);
        citedFacts.push({
          claim: sentence,
          toolName: "get_forecast",
          citation: firstCitation(result)
        });
        recommendations.push(`Treat ${vStr} as a model projection; validate against upcoming operational plans.`);
        break;
      }
      case "list_open_maintenance": {
        if (!Array.isArray(result.data)) {
          break;
        }
        if (result.data.length === 0) {
          const noItems = "No open maintenance items were returned for this tenant.";
          answerParts.push(noItems);
          citedFacts.push({
            claim: "The maintenance tool returned an empty open-items list.",
            toolName: "list_open_maintenance",
            citation: firstCitation(result)
          });
        } else {
          answerParts.push(
            "Open maintenance work items are present; review the maintenance tool output for details."
          );
          citedFacts.push({
            claim: "Open maintenance list is non-empty.",
            toolName: "list_open_maintenance",
            citation: firstCitation(result)
          });
        }
        recommendations.push("Schedule preventive work before utilization ramps if items remain open.");
        break;
      }
      case "get_vehicle_snapshot": {
        if (!isRecord(result.data)) {
          break;
        }
        const vehicleCount = typeof result.data.vehicleCount === "number" ? result.data.vehicleCount : 0;
        const movingCount = typeof result.data.movingCount === "number" ? result.data.movingCount : 0;
        const idleCount = typeof result.data.idleCount === "number" ? result.data.idleCount : 0;
        const countStr = String(vehicleCount);
        const movingStr = String(movingCount);
        const idleStr = String(idleCount);
        const sentence = `Fleet snapshot: ${countStr} vehicles tracked (${movingStr} moving, ${idleStr} idle in the sample).`;
        answerParts.push(sentence);
        citedFacts.push({
          claim: sentence,
          toolName: "get_vehicle_snapshot",
          citation: firstCitation(result)
        });
        recommendations.push("Ask about a specific plate number or sweeper for deeper trip and idle analysis.");
        break;
      }
      case "list_recent_insights": {
        if (!Array.isArray(result.data)) {
          break;
        }
        if (result.data.length === 0) {
          answerParts.push("No stored insights were found for this tenant yet.");
          citedFacts.push({
            claim: "Insight list is empty.",
            toolName: "list_recent_insights",
            citation: firstCitation(result)
          });
          break;
        }
        const top = result.data.slice(0, 3);
        for (const item of top) {
          if (!isRecord(item) || typeof item.title !== "string" || typeof item.description !== "string") {
            continue;
          }
          const line = `${item.title}: ${item.description}`;
          answerParts.push(line);
          citedFacts.push({
            claim: line,
            toolName: "list_recent_insights",
            citation: firstCitation(result)
          });
        }
        recommendations.push("Run analytics or backfill if you need fresher insight coverage.");
        break;
      }
      case "get_integration_status": {
        if (!isRecord(result.data) || typeof result.data.status !== "string") {
          break;
        }
        answerParts.push(`Integration status is ${result.data.status}.`);
        citedFacts.push({
          claim: `Integration status is ${result.data.status}.`,
          toolName: "get_integration_status",
          citation: firstCitation(result)
        });
        recommendations.push("Confirm partner credentials if integrations look stale.");
        break;
      }
      default:
        break;
    }
  }

  if (answerParts.length === 0) {
    return {
      answer:
        "I ran the planned tools but could not derive a safe numeric summary from the results. Try rephrasing with a timeframe or metric name.",
      recommendations: ["Ask about profit, efficiency, forecasts, maintenance, or a specific vehicle."],
      citedFacts: [],
      confidence: 0.55,
      needsFollowUp: true
    };
  }

  return {
    answer: answerParts.join(" "),
    recommendations,
    citedFacts,
    confidence: 0.86,
    needsFollowUp: payload.toolResults.length > 3
  };
}
