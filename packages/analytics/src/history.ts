import type { AnalyticsDataPoint, AnalyticsEngineInput } from "./contracts.js";
import { MIN_SERIES_FOR_BACKTEST } from "./forecast/backtest.js";
import { rebuildDailyMart } from "./daily-mart.js";
import { resolveTenantRateCard } from "./rate-card.js";
import {
  buildDailyAggregatesFromTelemetry,
  mergeTripAndTelemetryDailyMaps
} from "./telemetry-daily-rollup.js";
import {
  buildDailyAggregatesFromTrips,
  dailyAccumulatorToHistoryPoint,
  emptyDailyAccumulator
} from "./trip-daily-rollup.js";

/** Per-vehicle telemetry cap when building forecast history (backfill can be thousands of points). */
const TELEMETRY_HISTORY_LIMIT = 10_000;

const dayKey = (iso: string): string => iso.slice(0, 10);

const inWindow = (timestamp: string, start: string, end: string): boolean => timestamp >= start && timestamp <= end;

const aggregateMartToHistory = (
  aggregates: Array<{
    date: string;
    revenue: number;
    cost: number;
    fuelCostPerKm: number;
    idleRatioPct: number;
    utilizationPct: number;
  }>,
  maxDays: number
): AnalyticsDataPoint[] =>
  [...aggregates]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxDays)
    .map((row) => ({
      date: row.date,
      revenue: row.revenue,
      cost: row.cost,
      fuelCostPerKm: row.fuelCostPerKm,
      idleRatioPct: row.idleRatioPct,
      utilizationPct: row.utilizationPct
    }));

/**
 * Builds daily rollup series for forecasts. Prefers trip-based rollups (spread across
 * each day a trip spans) so long GPS trips do not collapse to a single calendar day.
 */
export async function buildDailyHistoryFromRepositories(
  input: AnalyticsEngineInput,
  maxDays = 90
): Promise<AnalyticsDataPoint[]> {
  const tripHistory = await buildHistoryFromRawTrips(input, maxDays);
  if (tripHistory.length >= MIN_SERIES_FOR_BACKTEST) {
    return tripHistory;
  }

  const { repositories, window } = input;

  if (repositories.fleetMetricDaily) {
    const fromMart = await repositories.fleetMetricDaily.listAggregatedByDay(window);
    if (fromMart.length >= MIN_SERIES_FOR_BACKTEST) {
      return aggregateMartToHistory(fromMart, maxDays);
    }
  }

  const rows = await rebuildDailyMart(input);
  if (rows.length === 0) {
    return tripHistory;
  }

  const byDay = new Map<string, ReturnType<typeof emptyDailyAccumulator> & { fuelCost: number }>();
  for (const row of rows) {
    const existing = byDay.get(row.date) ?? { ...emptyDailyAccumulator(), fuelCost: 0 };
    existing.revenue += row.revenue;
    existing.operatingCost += row.operatingCost;
    existing.fuelCost += row.fuelCost;
    existing.distanceKm += row.distanceKm;
    existing.idleRatioPct += row.idleRatioPct;
    existing.utilizationPct += row.utilizationPct;
    existing.ratioSamples += 1;
    byDay.set(row.date, existing);
  }

  const aggregates = [...byDay.entries()].map(([date, row]) =>
    dailyAccumulatorToHistoryPoint(date, row, row.fuelCost)
  );

  const martHistory = aggregateMartToHistory(aggregates, maxDays);
  return martHistory.length >= tripHistory.length ? martHistory : tripHistory;
}

async function buildHistoryFromRawTrips(input: AnalyticsEngineInput, maxDays: number): Promise<AnalyticsDataPoint[]> {
  const { repositories, window } = input;
  const [vehicles, rateCard] = await Promise.all([
    repositories.vehicles.list(),
    resolveTenantRateCard(repositories, input.tenantId)
  ]);

  const [allTrips, telemetryPoints] = await Promise.all([
    Promise.all(vehicles.map((vehicle) => repositories.trips.listByVehicle(vehicle.id))).then((rows) =>
      rows.flat()
    ),
    Promise.all(
      vehicles.map((vehicle) => repositories.telemetry.listByVehicle(vehicle.id, TELEMETRY_HISTORY_LIMIT))
    ).then((rows) => rows.flat())
  ]);

  const tripByDay = buildDailyAggregatesFromTrips(allTrips, rateCard, window);
  const telemetryByDay = buildDailyAggregatesFromTelemetry(telemetryPoints, rateCard, window);
  const byDay = mergeTripAndTelemetryDailyMaps(tripByDay, telemetryByDay);
  const fuelByDay = new Map<string, number>();

  for (const vehicle of vehicles) {
    const fuelReadings = await repositories.fuel.listByVehicle(vehicle.id);
    for (const fuel of fuelReadings) {
      if (!inWindow(fuel.timestamp, window.start, window.end)) {
        continue;
      }
      const key = dayKey(fuel.timestamp);
      fuelByDay.set(key, (fuelByDay.get(key) ?? 0) + fuel.totalCost);
    }
  }

  return [...byDay.entries()]
    .map(([date, row]) => dailyAccumulatorToHistoryPoint(date, row, fuelByDay.get(date) ?? 0))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxDays);
}
