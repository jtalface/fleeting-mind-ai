import type { MartQualityReport } from "@fleetmind/shared/contracts/analytics.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import { rebuildDailyMart } from "./daily-mart.js";
import { resolveForecastTrainingLookbackDays } from "./forecast-lookback.js";

export type { MartQualityReport };

const dayKey = (iso: string): string => iso.slice(0, 10);

const enumerateCalendarDays = (startIso: string, endIso: string): string[] => {
  const days: string[] = [];
  const cursor = new Date(`${dayKey(startIso)}T00:00:00.000Z`);
  const end = new Date(`${dayKey(endIso)}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const maxConsecutiveGap = (activeDays: Set<string>, calendarDays: string[]): number => {
  let maxGap = 0;
  let currentGap = 0;
  for (const day of calendarDays) {
    if (activeDays.has(day)) {
      maxGap = Math.max(maxGap, currentGap);
      currentGap = 0;
    } else {
      currentGap += 1;
    }
  }
  return Math.max(maxGap, currentGap);
};

export function resolveMartQualityThresholds(): { minHistoryDays: number; minCoveragePct: number } {
  const minHistoryDays = Math.min(
    90,
    Math.max(7, Number(process.env.MART_QA_MIN_HISTORY_DAYS ?? "14") || 14)
  );
  const minCoveragePct = Math.min(
    100,
    Math.max(10, Number(process.env.MART_QA_MIN_COVERAGE_PCT ?? "50") || 50)
  );
  return { minHistoryDays, minCoveragePct };
}

export async function assessMartQuality(
  input: AnalyticsEngineInput,
  options: { lookbackDays?: number } = {}
): Promise<MartQualityReport> {
  const lookbackDays = resolveForecastTrainingLookbackDays(options.lookbackDays);
  const { minHistoryDays, minCoveragePct } = resolveMartQualityThresholds();
  const rows = await rebuildDailyMart(input);

  const vehicles = await input.repositories.vehicles.list();
  const activeDays = new Set<string>();
  const distanceByVehicle = new Map<string, number>();

  for (const row of rows) {
    if (row.tripCount > 0 || row.distanceKm > 0 || row.revenue > 0) {
      activeDays.add(row.date);
    }
    distanceByVehicle.set(row.vehicleId, (distanceByVehicle.get(row.vehicleId) ?? 0) + row.distanceKm);
  }

  const vehiclesWithMartRows = new Set(rows.map((row) => row.vehicleId)).size;
  const vehiclesWithZeroDistance = [...distanceByVehicle.entries()].filter(([, km]) => km <= 0).length;
  const calendarDays = enumerateCalendarDays(input.window.start, input.window.end);
  const calendarDaysInWindow = calendarDays.length;
  const daysWithTripActivity = activeDays.size;
  const coveragePct =
    calendarDaysInWindow === 0 ? 0 : Math.round((daysWithTripActivity / calendarDaysInWindow) * 1000) / 10;
  const maxGapDays = maxConsecutiveGap(activeDays, calendarDays);

  const warnings: string[] = [];
  if (daysWithTripActivity < minHistoryDays) {
    warnings.push(
      `Only ${daysWithTripActivity} days with trip activity in the last ${lookbackDays}d (need ≥ ${minHistoryDays} for reliable forecasts).`
    );
  }
  if (coveragePct < minCoveragePct) {
    warnings.push(
      `Mart coverage is ${coveragePct}% of calendar days (need ≥ ${minCoveragePct}%). Run a longer Flespi backfill.`
    );
  }
  if (maxGapDays >= 3) {
    warnings.push(`Largest gap without trip activity: ${maxGapDays} consecutive days.`);
  }
  if (vehiclesWithZeroDistance > 0) {
    warnings.push(`${vehiclesWithZeroDistance} vehicle(s) have zero distance in the window.`);
  }
  if (vehicles.length === 0) {
    warnings.push("No vehicles registered for this tenant.");
  }

  const ok = warnings.length === 0;

  return {
    tenantId: input.tenantId,
    lookbackDays,
    window: input.window,
    vehicleCount: vehicles.length,
    vehiclesWithMartRows,
    vehiclesWithZeroDistance,
    calendarDaysInWindow,
    daysWithTripActivity,
    coveragePct,
    maxGapDays,
    historyDaysAvailable: daysWithTripActivity,
    minHistoryDaysRequired: minHistoryDays,
    minCoveragePctRequired: minCoveragePct,
    warnings,
    ok
  };
}
