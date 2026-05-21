import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";
import type {
  DeterministicForecast,
  InsightGenerationContext,
  KpiSnapshot
} from "@fleetmind/shared/contracts/analytics.js";
import type { Insight, TenantId, TimestampIso } from "@fleetmind/shared/contracts/domain.js";

export interface AnalyticsTimeWindow {
  start: TimestampIso;
  end: TimestampIso;
}

export interface AnalyticsDataPoint {
  date: string;
  revenue: number;
  cost: number;
  fuelCostPerKm: number;
  idleRatioPct: number;
  utilizationPct: number;
}

export interface AnalyticsEngineInput {
  tenantId: TenantId;
  repositories: TenantRepositorySet;
  window: AnalyticsTimeWindow;
  asOf: TimestampIso;
}

/** Restricts daily history to a segment needle or a single vehicle. */
export interface HistorySegmentFilter {
  nameIncludes?: string;
  vehicleId?: string;
}

export interface InsightRule {
  evaluate(snapshot: KpiSnapshot): Insight[];
}

export interface ForecastQualityMetrics {
  mae: number;
  mapePct: number;
  withinBandPct: number;
}

export interface ForecastEngine {
  forecast(
    tenantId: TenantId,
    metricKey: DeterministicForecast["metricKey"],
    history: AnalyticsDataPoint[],
    asOf: TimestampIso,
    horizonDays: number
  ): DeterministicForecast;
  evaluateQuality(prediction: number[], actual: number[], lowerBand: number[], upperBand: number[]): ForecastQualityMetrics;
}

export type InsightGenerator = (
  snapshot: KpiSnapshot,
  context?: InsightGenerationContext
) => Promise<Insight[]>;

export interface AnalyticsService {
  computeKpis(input: AnalyticsEngineInput): Promise<KpiSnapshot>;
  generateInsights(snapshot: KpiSnapshot, context?: InsightGenerationContext): Promise<Insight[]>;
  runForecasts(input: AnalyticsEngineInput, history: AnalyticsDataPoint[], horizonDays: number): DeterministicForecast[];
}
