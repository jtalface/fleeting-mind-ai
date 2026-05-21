import type { DeterministicForecast, ForecastAlgorithm, ForecastExplanation, ForecastPoint } from "./analytics.js";
import type { TenantId, TimestampIso } from "./domain.js";

export type PredictionScopeType = "fleet" | "segment" | "vehicle";

export interface PredictionHistoryPoint {
  date: string;
  actual: number;
}

export interface PredictionBundle {
  tenantId: TenantId;
  scopeType: PredictionScopeType;
  /** `fleet` for fleet-wide; segment label for segment scope; vehicle id for vehicle scope. */
  scopeKey: string;
  nameIncludes?: string;
  /** Display label for vehicle scopes (plate, external id, etc.). */
  scopeLabel?: string;
  metricKey: DeterministicForecast["metricKey"];
  trainedUntil: TimestampIso;
  horizonDays: number;
  predictedPoints: ForecastPoint[];
  explanation: ForecastExplanation;
  cachedAt: TimestampIso;
  /** Daily actuals through trainedUntil (for chart overlay). */
  historyActuals?: PredictionHistoryPoint[];
}

export interface PredictionsListResult {
  tenantId: TenantId;
  horizonDays: number;
  bundles: PredictionBundle[];
  generatedAt: TimestampIso;
}

export type ForecastEvaluationKind = "holdout" | "forward";

export interface ForecastEvaluationEntry {
  id: string;
  tenantId: TenantId;
  scopeType: PredictionScopeType;
  scopeKey: string;
  metricKey: DeterministicForecast["metricKey"];
  algorithm: ForecastAlgorithm;
  trainedUntil: TimestampIso;
  horizonDays: number;
  evaluationKind: ForecastEvaluationKind;
  mae: number;
  mapePct: number;
  withinBandPct: number;
  sampleSize: number;
  createdAt: TimestampIso;
}

export interface ForecastEvaluationListResult {
  tenantId: TenantId;
  evaluations: ForecastEvaluationEntry[];
}

export interface ForwardAccuracyEntry {
  id: string;
  runId: string;
  tenantId: TenantId;
  scopeType: PredictionScopeType;
  scopeKey: string;
  metricKey: DeterministicForecast["metricKey"];
  algorithm: ForecastAlgorithm;
  trainedUntil: TimestampIso;
  horizonDays: number;
  mae: number;
  mapePct: number;
  withinBandPct: number;
  scoredDays: number;
  createdAt: TimestampIso;
}

export interface ForwardAccuracyListResult {
  tenantId: TenantId;
  entries: ForwardAccuracyEntry[];
}

export interface EvaluationTrendPoint {
  scoredAt: TimestampIso;
  evaluationKind: ForecastEvaluationKind;
  mapePct: number;
  withinBandPct: number;
  trainedUntil: TimestampIso;
}

export interface EvaluationTrendSeries {
  scopeType: PredictionScopeType;
  scopeKey: string;
  metricKey: DeterministicForecast["metricKey"];
  evaluationKind: ForecastEvaluationKind;
  points: EvaluationTrendPoint[];
}

export interface EvaluationTrendsResult {
  tenantId: TenantId;
  series: EvaluationTrendSeries[];
}
