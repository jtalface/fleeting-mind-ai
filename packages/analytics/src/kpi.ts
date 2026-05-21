import type { KpiSnapshot } from "@fleetmind/shared/contracts/analytics.js";
import type { FuelReading, MetricValue, Trip, Vehicle } from "@fleetmind/shared/contracts/domain.js";
import type { TenantRateCardRecord } from "../../database/src/repositories/contracts.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import { resolveTenantRateCard } from "./rate-card.js";

const safeDivide = (numerator: number, denominator: number): number => (denominator === 0 ? 0 : numerator / denominator);

const round = (value: number): number => Math.round(value * 10000) / 10000;

const inWindow = (timestamp: string, start: string, end: string): boolean => timestamp >= start && timestamp <= end;

const toMetric = (metricKey: MetricValue["metricKey"], value: number, asOf: string): MetricValue => {
  const unitMap: Record<MetricValue["metricKey"], MetricValue["unit"]> = {
    revenue: "currency",
    cost: "currency",
    profit: "currency",
    profit_margin_pct: "percent",
    fuel_cost_per_km: "currency",
    idle_ratio_pct: "percent",
    utilization_pct: "percent",
    on_time_pct: "percent"
  };

  return {
    metricKey,
    value: round(value),
    unit: unitMap[metricKey],
    timeframe: "custom",
    asOf
  };
};

const calculateVehicleRevenue = (trips: Trip[], rateCard: TenantRateCardRecord): number =>
  trips.reduce((sum, trip) => sum + trip.distanceKm * rateCard.revenuePerKm, 0);

const calculateVehicleCosts = (trips: Trip[], fuelReadings: FuelReading[], rateCard: TenantRateCardRecord): number => {
  const fuel = fuelReadings.reduce((sum, reading) => sum + reading.totalCost, 0);
  const operating = trips.reduce((sum, trip) => sum + trip.distanceKm * rateCard.operatingCostPerKm, 0);
  return fuel + operating;
};

const computeVehicleMetrics = (
  vehicle: Vehicle,
  trips: Trip[],
  fuelReadings: FuelReading[],
  rateCard: TenantRateCardRecord,
  asOf: string
): { vehicleId: string; metrics: MetricValue[] } => {
  const revenue = calculateVehicleRevenue(trips, rateCard);
  const cost = calculateVehicleCosts(trips, fuelReadings, rateCard);
  const profit = revenue - cost;
  const totalDistance = trips.reduce((sum, trip) => sum + trip.distanceKm, 0);
  const totalIdleMinutes = trips.reduce((sum, trip) => sum + trip.idleMinutes, 0);
  const tripDurationMinutes = trips.reduce(
    (sum, trip) => sum + (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / (1000 * 60),
    0
  );
  const fuelSpend = fuelReadings.reduce((sum, reading) => sum + reading.totalCost, 0);
  const idleRatioPct = safeDivide(totalIdleMinutes, tripDurationMinutes) * 100;
  const utilizationPct = safeDivide(tripDurationMinutes - totalIdleMinutes, tripDurationMinutes) * 100;
  const metrics = [
    toMetric("revenue", revenue, asOf),
    toMetric("cost", cost, asOf),
    toMetric("profit", profit, asOf),
    toMetric("profit_margin_pct", safeDivide(profit, revenue) * 100, asOf),
    toMetric("fuel_cost_per_km", safeDivide(fuelSpend, totalDistance), asOf),
    toMetric("idle_ratio_pct", idleRatioPct, asOf),
    toMetric("utilization_pct", utilizationPct, asOf)
  ];
  return { vehicleId: vehicle.id, metrics };
};

export const computeKpiSnapshot = async (input: AnalyticsEngineInput): Promise<KpiSnapshot> => {
  const { repositories, window, asOf, tenantId } = input;
  const [vehicles, rateCard] = await Promise.all([
    repositories.vehicles.list(),
    resolveTenantRateCard(repositories, tenantId)
  ]);

  const perVehicle = await Promise.all(
    vehicles.map(async (vehicle) => {
      const [trips, fuelReadings] = await Promise.all([
        repositories.trips.listByVehicle(vehicle.id),
        repositories.fuel.listByVehicle(vehicle.id)
      ]);
      return computeVehicleMetrics(
        vehicle,
        trips.filter((item) => inWindow(item.endTime, window.start, window.end)),
        fuelReadings.filter((item) => inWindow(item.timestamp, window.start, window.end)),
        rateCard,
        asOf
      );
    })
  );

  const totals = perVehicle.reduce(
    (acc, vehicle) => {
      const getMetric = (key: MetricValue["metricKey"]): number =>
        vehicle.metrics.find((metric) => metric.metricKey === key)?.value ?? 0;
      acc.revenue += getMetric("revenue");
      acc.cost += getMetric("cost");
      acc.profit += getMetric("profit");
      acc.fuelCostPerKm += getMetric("fuel_cost_per_km");
      acc.idleRatioPct += getMetric("idle_ratio_pct");
      acc.utilizationPct += getMetric("utilization_pct");
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, fuelCostPerKm: 0, idleRatioPct: 0, utilizationPct: 0 }
  );

  const divisor = Math.max(1, perVehicle.length);
  const fleetMetrics = [
    toMetric("revenue", totals.revenue, asOf),
    toMetric("cost", totals.cost, asOf),
    toMetric("profit", totals.profit, asOf),
    toMetric("profit_margin_pct", safeDivide(totals.profit, totals.revenue) * 100, asOf),
    toMetric("fuel_cost_per_km", totals.fuelCostPerKm / divisor, asOf),
    toMetric("idle_ratio_pct", totals.idleRatioPct / divisor, asOf),
    toMetric("utilization_pct", totals.utilizationPct / divisor, asOf)
  ];

  return {
    tenantId,
    generatedAt: asOf,
    timeframe: "custom",
    metricWindow: { start: window.start, end: window.end },
    fleetMetrics,
    vehicleMetrics: perVehicle
  };
};
