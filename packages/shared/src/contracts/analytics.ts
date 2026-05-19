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
  value: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastExplanation {
  algorithm: "linear_regression_with_residual_band";
  slopePerDay: number;
  intercept: number;
  sampleSize: number;
  residualStdDev: number;
}

export interface DeterministicForecast {
  tenantId: TenantId;
  metricKey: "revenue" | "cost" | "profit" | "fuel_cost_per_km" | "idle_ratio_pct" | "utilization_pct";
  trainedUntil: TimestampIso;
  horizonDays: number;
  predictedPoints: ForecastPoint[];
  explanation: ForecastExplanation;
}

export interface AnalyticsReport {
  tenantId: TenantId;
  generatedAt: TimestampIso;
  kpis: KpiSnapshot;
  insights: Insight[];
  forecasts: DeterministicForecast[];
}
