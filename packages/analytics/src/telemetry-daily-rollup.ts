import type { TelemetryPoint } from "@fleetmind/shared/contracts/domain.js";
import type { TenantRateCardRecord } from "../../database/src/repositories/contracts.js";
import type { DailyMetricAccumulator } from "./trip-daily-rollup.js";

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number): number => (value * Math.PI) / 180;

const dayKey = (iso: string): string => iso.slice(0, 10);

const inWindow = (timestamp: string, start: string, end: string): boolean => timestamp >= start && timestamp <= end;

const haversineDistanceKm = (a: TelemetryPoint, b: TelemetryPoint): number => {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);
  const arc =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
};

/**
 * Daily distance/revenue from GPS points (one row per calendar day with telemetry).
 */
export function buildDailyAggregatesFromTelemetry(
  points: TelemetryPoint[],
  rateCard: TenantRateCardRecord,
  window: { start: string; end: string }
): Map<string, DailyMetricAccumulator> {
  const byDay = new Map<string, TelemetryPoint[]>();

  for (const point of points) {
    if (!inWindow(point.timestamp, window.start, window.end)) {
      continue;
    }
    const key = dayKey(point.timestamp);
    const bucket = byDay.get(key) ?? [];
    bucket.push(point);
    byDay.set(key, bucket);
  }

  const aggregates = new Map<string, DailyMetricAccumulator>();

  for (const [date, dayPoints] of byDay) {
    const ordered = [...dayPoints].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let distanceKm = 0;
    let idleMinutes = 0;
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (!previous || !current) {
        continue;
      }
      distanceKm += haversineDistanceKm(previous, current);
      const gapMinutes = (Date.parse(current.timestamp) - Date.parse(previous.timestamp)) / 60_000;
      if (gapMinutes > 0 && (current.speedKph ?? 0) <= 5) {
        idleMinutes += gapMinutes;
      }
    }

    const tripMinutes = ordered.length > 1
      ? (Date.parse(ordered[ordered.length - 1]!.timestamp) - Date.parse(ordered[0]!.timestamp)) / 60_000
      : 0;

    aggregates.set(date, {
      revenue: distanceKm * rateCard.revenuePerKm,
      operatingCost: distanceKm * rateCard.operatingCostPerKm,
      distanceKm,
      tripCount: 0,
      idleRatioPct: tripMinutes > 0 ? (idleMinutes / tripMinutes) * 100 : 0,
      utilizationPct: tripMinutes > 0 ? ((tripMinutes - idleMinutes) / tripMinutes) * 100 : 0,
      ratioSamples: 1
    });
  }

  return aggregates;
}

/** Prefer telemetry days; when both exist, keep the day with greater GPS distance. */
export function mergeTripAndTelemetryDailyMaps(
  tripByDay: Map<string, DailyMetricAccumulator>,
  telemetryByDay: Map<string, DailyMetricAccumulator>
): Map<string, DailyMetricAccumulator> {
  const merged = new Map<string, DailyMetricAccumulator>();

  for (const [day, acc] of tripByDay) {
    merged.set(day, { ...acc });
  }

  for (const [day, telAcc] of telemetryByDay) {
    const existing = merged.get(day);
    if (!existing || telAcc.distanceKm > existing.distanceKm) {
      merged.set(day, { ...telAcc });
    }
  }

  return merged;
}
