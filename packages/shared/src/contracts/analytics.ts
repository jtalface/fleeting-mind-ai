import type { Insight, MetricValue, TenantId, TimestampIso, VehicleId } from "./domain.js";

export interface KpiSnapshot {
  tenantId: TenantId;
  generatedAt: TimestampIso;
  timeframe: "custom";
  metricWindow: {
    start: TimestampIso;
    end: TimestampIso;
  };
  fleetMetrics: MetricValue[];
  vehicleMetrics: Array<{
    vehicleId: VehicleId;
    metrics: MetricValue[];
  }>;
}

export interface ForecastPoint {
  date: string;
  /** Median forecast (P50). */
  p50: number;
  /** Lower quantile (P10). */
  p10: number;
  /** Upper quantile (P90). */
  p90: number;
  /** Alias for {@link p50} — chart compatibility. */
  value: number;
  /** Alias for {@link p10}. */
  lowerBound: number;
  /** Alias for {@link p90}. */
  upperBound: number;
}

export type ForecastAlgorithm =
  | "seasonal_naive"
  | "ets"
  | "gradient_boosting_stumps"
  | "linear_regression_with_residual_band";

export interface ForecastCandidateScore {
  algorithm: ForecastAlgorithm;
  mapePct: number;
}

export interface ForecastExplanation {
  algorithm: ForecastAlgorithm;
  sampleSize: number;
  residualStdDev: number;
  championSelected?: boolean;
  backtestMapePct?: number;
  candidates?: ForecastCandidateScore[];
  slopePerDay?: number;
  intercept?: number;
  seasonPeriod?: number;
  treeCount?: number;
}

export interface DeterministicForecast {
  tenantId: TenantId;
  metricKey: "revenue" | "cost" | "profit" | "fuel_cost_per_km" | "idle_ratio_pct" | "utilization_pct";
  trainedUntil: TimestampIso;
  horizonDays: number;
  predictedPoints: ForecastPoint[];
  explanation: ForecastExplanation;
}

export interface InsightForecastSummary {
  metricKey: DeterministicForecast["metricKey"];
  algorithm: ForecastAlgorithm;
  sampleSize: number;
  backtestMapePct?: number;
  horizonDays: number;
  /** First horizon day P50 from cached/scored forecast. */
  nextP50?: number;
}

/** Optional deterministic context passed to the insight generator (LLM narrates these facts only). */
export interface InsightGenerationContext {
  forecasts?: InsightForecastSummary[];
  /** Clarifies KPI window totals vs daily forecast medians for the LLM. */
  analyticsNote?: string;
}

export interface AnalyticsReport {
  tenantId: TenantId;
  generatedAt: TimestampIso;
  kpis: KpiSnapshot;
  insights: Insight[];
  forecasts: DeterministicForecast[];
}
