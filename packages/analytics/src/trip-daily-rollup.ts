import type { Trip } from "@fleetmind/shared/contracts/domain.js";
import type { TenantRateCardRecord } from "../../database/src/repositories/contracts.js";

export interface DailyMetricAccumulator {
  revenue: number;
  operatingCost: number;
  distanceKm: number;
  tripCount: number;
  idleRatioPct: number;
  utilizationPct: number;
  ratioSamples: number;
}

export const emptyDailyAccumulator = (): DailyMetricAccumulator => ({
  revenue: 0,
  operatingCost: 0,
  distanceKm: 0,
  tripCount: 0,
  idleRatioPct: 0,
  utilizationPct: 0,
  ratioSamples: 0
});

const utcDayStartMs = (day: string): number => Date.parse(`${day}T00:00:00.000Z`);

const utcDayEndMs = (day: string): number => Date.parse(`${day}T23:59:59.999Z`);

const listUtcDaysBetween = (startMs: number, endMs: number): string[] => {
  if (endMs < startMs) {
    return [];
  }
  const days: string[] = [];
  const cursor = new Date(startMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(endMs);
  endDay.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= endDay.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const overlapMs = (rangeStart: number, rangeEnd: number, windowStart: number, windowEnd: number): number => {
  const start = Math.max(rangeStart, windowStart);
  const end = Math.min(rangeEnd, windowEnd);
  return Math.max(0, end - start);
};

/**
 * Spreads trip economics across every UTC calendar day the trip spans (by time share).
 * Fixes long GPS trips that previously only credited the trip end date.
 */
export function allocateTripToDailyBuckets(
  trip: Trip,
  rateCard: TenantRateCardRecord,
  byDay: Map<string, DailyMetricAccumulator>
): void {
  const startMs = Date.parse(trip.startTime);
  const endMs = Date.parse(trip.endTime);
  const durationMs = Math.max(1, endMs - startMs);
  const tripRevenue = trip.distanceKm * rateCard.revenuePerKm;
  const tripOperating = trip.distanceKm * rateCard.operatingCostPerKm;
  const tripMinutes = durationMs / 60_000;
  const idleRatio = tripMinutes > 0 ? (trip.idleMinutes / tripMinutes) * 100 : 0;
  const utilization = tripMinutes > 0 ? ((tripMinutes - trip.idleMinutes) / tripMinutes) * 100 : 0;

  const days = listUtcDaysBetween(startMs, endMs);
  for (const day of days) {
    const dayStart = utcDayStartMs(day);
    const dayEnd = utcDayEndMs(day);
    const shareMs = overlapMs(startMs, endMs, dayStart, dayEnd);
    if (shareMs <= 0) {
      continue;
    }
    const fraction = shareMs / durationMs;
    const row = byDay.get(day) ?? emptyDailyAccumulator();
    row.revenue += tripRevenue * fraction;
    row.operatingCost += tripOperating * fraction;
    row.distanceKm += trip.distanceKm * fraction;
    row.tripCount += 1;
    row.idleRatioPct += idleRatio;
    row.utilizationPct += utilization;
    row.ratioSamples += 1;
    byDay.set(day, row);
  }
}

export function buildDailyAggregatesFromTrips(
  trips: Trip[],
  rateCard: TenantRateCardRecord,
  window: { start: string; end: string }
): Map<string, DailyMetricAccumulator> {
  const byDay = new Map<string, DailyMetricAccumulator>();
  for (const trip of trips) {
    if (trip.endTime < window.start || trip.endTime > window.end) {
      continue;
    }
    allocateTripToDailyBuckets(trip, rateCard, byDay);
  }
  return byDay;
}

export const dailyAccumulatorToHistoryPoint = (
  date: string,
  row: DailyMetricAccumulator,
  fuelCost = 0
): {
  date: string;
  revenue: number;
  cost: number;
  fuelCostPerKm: number;
  idleRatioPct: number;
  utilizationPct: number;
} => {
  const samples = Math.max(1, row.ratioSamples);
  const cost = row.operatingCost + fuelCost;
  return {
    date,
    revenue: round4(row.revenue),
    cost: round4(cost),
    fuelCostPerKm: row.distanceKm > 0 ? round4(fuelCost / row.distanceKm) : 0,
    idleRatioPct: round4(row.idleRatioPct / samples),
    utilizationPct: round4(row.utilizationPct / samples)
  };
};

const round4 = (value: number): number => Math.round(value * 10000) / 10000;
