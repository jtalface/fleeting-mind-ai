import type { DeterministicForecast, InsightGenerationContext } from "@fleetmind/shared/contracts/analytics.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";
import type {
  AnalyticsDataPoint,
  AnalyticsEngineInput,
  AnalyticsService,
  InsightGenerator
} from "./contracts.js";
import { ChampionForecastEngine } from "./forecast/champion-engine.js";
import { generateRuleBasedInsights } from "./insights.js";
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
  private readonly forecastEngine = new ChampionForecastEngine();

  public constructor(private readonly insightGenerator?: InsightGenerator) {}

  public async computeKpis(input: AnalyticsEngineInput) {
    return computeKpiSnapshot(input);
  }

  public async generateInsights(
    snapshot: Awaited<ReturnType<DefaultAnalyticsService["computeKpis"]>>,
    context?: InsightGenerationContext
  ): Promise<Insight[]> {
    if (this.insightGenerator) {
      return this.insightGenerator(snapshot, context);
    }
    return generateRuleBasedInsights(snapshot);
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
