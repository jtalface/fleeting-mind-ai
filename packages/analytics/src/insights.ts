import type { KpiSnapshot } from "@fleetmind/shared/contracts/analytics.js";
import type { Insight } from "@fleetmind/shared/contracts/domain.js";
import type { InsightRule } from "./contracts.js";

const insightId = (suffix: string): string => `insight_${suffix}`;

class FleetProfitRule implements InsightRule {
  public evaluate(snapshot: KpiSnapshot): Insight[] {
    const profit = snapshot.fleetMetrics.find((metric) => metric.metricKey === "profit")?.value ?? 0;
    if (profit >= 0) {
      return [];
    }

    return [
      {
        id: insightId("fleet_profit"),
        tenantId: snapshot.tenantId,
        entityType: "fleet",
        entityId: snapshot.tenantId,
        severity: "critical",
        title: "Fleet is operating at a loss",
        description: `Current profit is ${profit.toFixed(2)} in the selected window.`,
        supportingMetrics: snapshot.fleetMetrics.filter((metric) => metric.metricKey === "profit"),
        recommendation: "Reduce idle time and prioritize high-margin routes this week.",
        confidence: 0.93,
        createdAt: snapshot.generatedAt
      }
    ];
  }
}

class VehicleIdleRule implements InsightRule {
  public evaluate(snapshot: KpiSnapshot): Insight[] {
    return snapshot.vehicleMetrics
      .filter((vehicle) => (vehicle.metrics.find((metric) => metric.metricKey === "idle_ratio_pct")?.value ?? 0) >= 30)
      .map((vehicle) => ({
        id: insightId(`idle_${vehicle.vehicleId}`),
        tenantId: snapshot.tenantId,
        entityType: "vehicle",
        entityId: vehicle.vehicleId,
        severity: "warning" as const,
        title: "Vehicle idle ratio is above target",
        description: "Idle ratio crossed 30%, indicating operational inefficiency.",
        supportingMetrics: vehicle.metrics.filter((metric) => metric.metricKey === "idle_ratio_pct"),
        recommendation: "Review dispatch assignment and reduce excessive stop durations.",
        confidence: 0.88,
        createdAt: snapshot.generatedAt
      }));
  }
}

class FleetActivityRule implements InsightRule {
  public evaluate(snapshot: KpiSnapshot): Insight[] {
    const activeVehicles = snapshot.vehicleMetrics.filter((vehicle) => {
      const revenue = vehicle.metrics.find((metric) => metric.metricKey === "revenue")?.value ?? 0;
      return revenue > 0;
    });
    if (activeVehicles.length === 0) {
      return [];
    }

    const fleetIdle =
      snapshot.fleetMetrics.find((metric) => metric.metricKey === "idle_ratio_pct")?.value ?? 0;
    const fleetUtilization =
      snapshot.fleetMetrics.find((metric) => metric.metricKey === "utilization_pct")?.value ?? 0;

    return [
      {
        id: insightId("fleet_activity"),
        tenantId: snapshot.tenantId,
        entityType: "fleet",
        entityId: snapshot.tenantId,
        severity: "info",
        title: "Fleet activity detected in analysis window",
        description: `${activeVehicles.length} vehicle(s) recorded trips in this window. Fleet average idle ${fleetIdle.toFixed(1)}%, utilization ${fleetUtilization.toFixed(1)}%.`,
        supportingMetrics: snapshot.fleetMetrics.filter((metric) =>
          ["idle_ratio_pct", "utilization_pct", "revenue"].includes(metric.metricKey)
        ),
        recommendation: "Review high-idle vehicles and confirm dispatch coverage for underutilized assets.",
        confidence: 0.85,
        createdAt: snapshot.generatedAt
      }
    ];
  }
}

class VehicleFuelEfficiencyRule implements InsightRule {
  public evaluate(snapshot: KpiSnapshot): Insight[] {
    return snapshot.vehicleMetrics
      .filter((vehicle) => (vehicle.metrics.find((metric) => metric.metricKey === "fuel_cost_per_km")?.value ?? 0) >= 1.2)
      .map((vehicle) => ({
        id: insightId(`fuel_${vehicle.vehicleId}`),
        tenantId: snapshot.tenantId,
        entityType: "vehicle" as const,
        entityId: vehicle.vehicleId,
        severity: "info" as const,
        title: "Fuel cost per km is elevated",
        description: "Fuel cost/km is above benchmark and can impact margin.",
        supportingMetrics: vehicle.metrics.filter((metric) => metric.metricKey === "fuel_cost_per_km"),
        recommendation: "Prioritize route optimization and monitor fuel anomalies.",
        confidence: 0.8,
        createdAt: snapshot.generatedAt
      }));
  }
}

const defaultRules: InsightRule[] = [
  new FleetActivityRule(),
  new FleetProfitRule(),
  new VehicleIdleRule(),
  new VehicleFuelEfficiencyRule()
];

export const generateRuleBasedInsights = (
  snapshot: KpiSnapshot,
  rules: InsightRule[] = defaultRules
): Insight[] => rules.flatMap((rule) => rule.evaluate(snapshot));

/** @deprecated Use {@link generateRuleBasedInsights} or an injected LLM insight generator. */
export const generateInsights = generateRuleBasedInsights;
