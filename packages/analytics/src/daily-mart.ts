import type { FleetMetricDailyRow, TenantRateCardRecord } from "../../database/src/repositories/contracts.js";
import type { FuelReading, Trip, Vehicle } from "@fleetmind/shared/contracts/domain.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import { resolveTenantRateCard } from "./rate-card.js";
import { allocateTripToDailyBuckets, emptyDailyAccumulator } from "./trip-daily-rollup.js";

const dayKey = (iso: string): string => iso.slice(0, 10);

const inWindow = (timestamp: string, start: string, end: string): boolean => timestamp >= start && timestamp <= end;

interface VehicleDayAccumulator {
  revenue: number;
  operatingCost: number;
  fuelCost: number;
  distanceKm: number;
  tripCount: number;
  idleRatioPct: number;
  utilizationPct: number;
  ratioSamples: number;
}

const emptyAccumulator = (): VehicleDayAccumulator => ({
  revenue: 0,
  operatingCost: 0,
  fuelCost: 0,
  distanceKm: 0,
  tripCount: 0,
  idleRatioPct: 0,
  utilizationPct: 0,
  ratioSamples: 0
});

export function buildVehicleDailyRows(
  tenantId: string,
  vehicles: Vehicle[],
  tripsByVehicle: Map<string, Trip[]>,
  fuelByVehicle: Map<string, FuelReading[]>,
  rateCard: TenantRateCardRecord,
  window: { start: string; end: string }
): FleetMetricDailyRow[] {
  const byKey = new Map<string, VehicleDayAccumulator>();

  for (const vehicle of vehicles) {
    const trips = tripsByVehicle.get(vehicle.id) ?? [];
    for (const trip of trips) {
      if (!inWindow(trip.endTime, window.start, window.end)) {
        continue;
      }
      const perDay = new Map<string, ReturnType<typeof emptyDailyAccumulator>>();
      allocateTripToDailyBuckets(trip, rateCard, perDay);
      for (const [date, acc] of perDay) {
        const key = `${vehicle.id}:${date}`;
        const row = byKey.get(key) ?? emptyAccumulator();
        row.revenue += acc.revenue;
        row.operatingCost += acc.operatingCost;
        row.distanceKm += acc.distanceKm;
        row.tripCount += acc.tripCount;
        row.idleRatioPct += acc.idleRatioPct;
        row.utilizationPct += acc.utilizationPct;
        row.ratioSamples += acc.ratioSamples;
        byKey.set(key, row);
      }
    }

    const fuelReadings = fuelByVehicle.get(vehicle.id) ?? [];
    for (const fuel of fuelReadings) {
      if (!inWindow(fuel.timestamp, window.start, window.end)) {
        continue;
      }
      const key = `${vehicle.id}:${dayKey(fuel.timestamp)}`;
      const row = byKey.get(key) ?? emptyAccumulator();
      row.fuelCost += fuel.totalCost;
      row.operatingCost += fuel.totalCost;
      byKey.set(key, row);
    }
  }

  const rows: FleetMetricDailyRow[] = [];
  for (const [key, acc] of byKey.entries()) {
    const [vehicleId, date] = key.split(":");
    if (!vehicleId || !date) {
      continue;
    }
    const samples = Math.max(1, acc.ratioSamples);
    rows.push({
      tenantId,
      vehicleId,
      date,
      revenue: round4(acc.revenue),
      operatingCost: round4(acc.operatingCost),
      fuelCost: round4(acc.fuelCost),
      distanceKm: round4(acc.distanceKm),
      tripCount: acc.tripCount,
      idleRatioPct: round4(acc.idleRatioPct / samples),
      utilizationPct: round4(acc.utilizationPct / samples)
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.vehicleId.localeCompare(b.vehicleId));
}

export async function rebuildDailyMart(input: AnalyticsEngineInput): Promise<FleetMetricDailyRow[]> {
  const { repositories, window, tenantId } = input;
  const [vehicles, rateCard] = await Promise.all([
    repositories.vehicles.list(),
    resolveTenantRateCard(repositories, tenantId)
  ]);

  const tripsByVehicle = new Map<string, Trip[]>();
  const fuelByVehicle = new Map<string, FuelReading[]>();
  await Promise.all(
    vehicles.map(async (vehicle) => {
      const [trips, fuel] = await Promise.all([
        repositories.trips.listByVehicle(vehicle.id),
        repositories.fuel.listByVehicle(vehicle.id)
      ]);
      tripsByVehicle.set(vehicle.id, trips);
      fuelByVehicle.set(vehicle.id, fuel);
    })
  );

  const rows = buildVehicleDailyRows(tenantId, vehicles, tripsByVehicle, fuelByVehicle, rateCard, window);
  if (repositories.fleetMetricDaily && rows.length > 0) {
    await repositories.fleetMetricDaily.upsertMany(rows);
  }
  return rows;
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000;
