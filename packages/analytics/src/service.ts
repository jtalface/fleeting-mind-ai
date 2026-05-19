import type { DeterministicForecast } from "@fleetmind/shared/contracts/analytics.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";
import type { AnalyticsDataPoint, AnalyticsEngineInput, AnalyticsService } from "./contracts.js";
import { DeterministicForecastEngine } from "./forecast.js";
import { generateInsights } from "./insights.js";
import { computeKpiSnapshot } from "./kpi.js";

const defaultMetricKeys: DeterministicForecast["metricKey"][] = [
  "revenue",
  "cost",
  "profit",
  "fuel_cost_per_km",
  "idle_ratio_pct",
  "utilization_pct"
];

export class DefaultAnalyticsService implements AnalyticsService {
  private readonly forecastEngine = new DeterministicForecastEngine();

  public async computeKpis(input: AnalyticsEngineInput) {
    return computeKpiSnapshot(input);
  }

  public generateInsights(snapshot: Awaited<ReturnType<DefaultAnalyticsService["computeKpis"]>>): Insight[] {
    return generateInsights(snapshot);
  }

  public runForecasts(
    input: AnalyticsEngineInput,
    history: AnalyticsDataPoint[],
    horizonDays: number
  ): DeterministicForecast[] {
    return defaultMetricKeys.map((metricKey) =>
      this.forecastEngine.forecast(input.tenantId, metricKey, history, input.asOf, horizonDays)
    );
  }
}
