import type { Insight, MetricValue, TenantId, TimestampIso, VehicleId } from "./domain.js";
export type ToolName = "get_vehicle_snapshot" | "get_profitability_summary" | "get_operational_efficiency" | "get_forecast" | "list_open_maintenance" | "get_integration_status";
export interface ToolContext {
    tenantId: TenantId;
    requestId: string;
    userId: string;
    now: TimestampIso;
}
export interface ToolRequest<TInput = Record<string, unknown>> {
    toolName: ToolName;
    input: TInput;
    context: ToolContext;
}
export interface ToolResult<TData = Record<string, unknown>> {
    toolName: ToolName;
    ok: boolean;
    data?: TData;
    errorCode?: string;
    errorMessage?: string;
    observedAt: TimestampIso;
    citations: string[];
}
export interface VehicleSnapshotOutput {
    vehicleId: VehicleId;
    latestLocation?: {
        latitude: number;
        longitude: number;
        timestamp: TimestampIso;
    };
    status: "moving" | "idle" | "offline";
    odometerKm?: number;
    fuelLevelPct?: number;
}
export interface ProfitabilitySummaryOutput {
    tenantId: TenantId;
    timeframe: string;
    metrics: MetricValue[];
    topPerformingVehicles: Array<{
        vehicleId: VehicleId;
        profit: number;
    }>;
    underPerformingVehicles: Array<{
        vehicleId: VehicleId;
        profit: number;
    }>;
}
export interface ForecastOutput {
    metricKey: "revenue" | "cost" | "profit" | "fuel_spend";
    horizonDays: number;
    predictedPoints: Array<{
        date: string;
        value: number;
        lowerBound: number;
        upperBound: number;
    }>;
    modelMetadata: {
        algorithm: string;
        trainedUntil: TimestampIso;
        qualityScore: number;
    };
}
export interface CopilotGroundingPayload {
    question: string;
    toolResults: ToolResult[];
    insights: Insight[];
    assumptions: string[];
    guardrails: string[];
}
export interface CopilotResponse {
    answer: string;
    recommendations: string[];
    citedFacts: Array<{
        claim: string;
        toolName: ToolName;
        citation: string;
    }>;
    confidence: number;
    needsFollowUp: boolean;
}
export interface AnalyticsOutput {
    tenantId: TenantId;
    generatedAt: TimestampIso;
    metrics: MetricValue[];
    insights: Insight[];
}
//# sourceMappingURL=ai.d.ts.map