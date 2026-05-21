import type { DeterministicForecast, ForecastExplanation, ForecastPoint } from "./analytics.js";
import type { TenantId, TimestampIso } from "./domain.js";

export type PredictionScopeType = "fleet" | "segment";

export interface PredictionBundle {
  tenantId: TenantId;
  scopeType: PredictionScopeType;
  /** `fleet` for fleet-wide; segment needle (e.g. `Sweeper`) for segment scope. */
  scopeKey: string;
  nameIncludes?: string;
  metricKey: DeterministicForecast["metricKey"];
  trainedUntil: TimestampIso;
  horizonDays: number;
  predictedPoints: ForecastPoint[];
  explanation: ForecastExplanation;
  cachedAt: TimestampIso;
}

export interface PredictionsListResult {
  tenantId: TenantId;
  horizonDays: number;
  bundles: PredictionBundle[];
  generatedAt: TimestampIso;
}
