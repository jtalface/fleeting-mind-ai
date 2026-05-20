import type { Trip, Vehicle } from "@fleetmind/shared/contracts/domain.js";
import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { AnalyticsEngineInput } from "./contracts.js";

const safeDivide = (numerator: number, denominator: number): number => (denominator === 0 ? 0 : numerator / denominator);

const round = (value: number): number => Math.round(value * 10000) / 10000;

const inWindow = (timestamp: string, start: string, end: string): boolean =>
  timestamp >= start && timestamp <= end;

export function filterVehiclesByNameNeedle(vehicles: Vehicle[], nameIncludes: string): Vehicle[] {
  const needle = nameIncludes.trim().toLowerCase();
  if (!needle) {
    return vehicles;
  }

  return vehicles.filter((vehicle) => {
    const haystacks = [vehicle.plateNumber, vehicle.vin, vehicle.externalId, vehicle.make, vehicle.model].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
    return haystacks.some((value) => value.toLowerCase().includes(needle));
  });
}

export interface VehicleGroupMemberMetrics {
  vehicleId: string;
  externalId?: string;
  label: string;
  idleRatioPct: number;
  utilizationPct: number;
  tripCount: number;
  status: "moving" | "idle" | "offline";
}

export interface VehicleGroupMetricsResult {
  nameIncludes: string;
  matchedCount: number;
  fleetTotalCount: number;
  groupAvgIdleRatioPct: number;
  groupAvgUtilizationPct: number;
  movingCount: number;
  idleCount: number;
  offlineCount: number;
  vehicles: VehicleGroupMemberMetrics[];
  window: { start: string; end: string };
}

function computeIdleUtilFromTrips(
  trips: Trip[]
): { idleRatioPct: number; utilizationPct: number; tripCount: number } {
  if (trips.length === 0) {
    return { idleRatioPct: 0, utilizationPct: 0, tripCount: 0 };
  }

  const totalIdleMinutes = trips.reduce((sum, trip) => sum + trip.idleMinutes, 0);
  const tripDurationMinutes = trips.reduce(
    (sum, trip) => sum + (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / (1000 * 60),
    0
  );
  const idleRatioPct = round(safeDivide(totalIdleMinutes, tripDurationMinutes) * 100);
  const utilizationPct = round(safeDivide(tripDurationMinutes - totalIdleMinutes, tripDurationMinutes) * 100);

  return { idleRatioPct, utilizationPct, tripCount: trips.length };
}

export async function computeVehicleGroupMetrics(
  input: AnalyticsEngineInput & { nameIncludes: string }
): Promise<VehicleGroupMetricsResult> {
  const { repositories, window, nameIncludes } = input;
  const allVehicles = await repositories.vehicles.list();
  const matched = filterVehiclesByNameNeedle(allVehicles, nameIncludes);

  const members: VehicleGroupMemberMetrics[] = await Promise.all(
    matched.map(async (vehicle) => {
      const [trips, latestTelemetry] = await Promise.all([
        repositories.trips.listByVehicle(vehicle.id),
        repositories.telemetry.listByVehicle(vehicle.id, 1)
      ]);
      const tripsInWindow = trips.filter((trip) => inWindow(trip.endTime, window.start, window.end));
      const { idleRatioPct, utilizationPct, tripCount } = computeIdleUtilFromTrips(tripsInWindow);
      const latest = latestTelemetry[0];
      const status: VehicleGroupMemberMetrics["status"] =
        latest && (latest.speedKph ?? 0) > 5 ? "moving" : latest ? "idle" : "offline";

      return {
        vehicleId: vehicle.id,
        ...(vehicle.externalId ? { externalId: vehicle.externalId } : {}),
        label: vehicle.plateNumber ?? vehicle.vin,
        idleRatioPct,
        utilizationPct,
        tripCount,
        status
      };
    })
  );

  const withTrips = members.filter((m) => m.tripCount > 0);

  return normalizeVehicleGroupAverages({
    nameIncludes,
    matchedCount: members.length,
    fleetTotalCount: allVehicles.length,
    groupAvgIdleRatioPct:
      withTrips.length > 0
        ? round(withTrips.reduce((sum, m) => sum + m.idleRatioPct, 0) / withTrips.length)
        : 0,
    groupAvgUtilizationPct:
      withTrips.length > 0
        ? round(withTrips.reduce((sum, m) => sum + m.utilizationPct, 0) / withTrips.length)
        : 0,
    movingCount: members.filter((m) => m.status === "moving").length,
    idleCount: members.filter((m) => m.status === "idle").length,
    offlineCount: members.filter((m) => m.status === "offline").length,
    vehicles: members,
    window: { start: window.start, end: window.end }
  });
}

export function normalizeVehicleGroupAverages(
  result: VehicleGroupMetricsResult
): VehicleGroupMetricsResult {
  const withTrips = result.vehicles.filter((m) => m.tripCount > 0);
  if (withTrips.length === 0) {
    return result;
  }

  let groupAvgIdleRatioPct = result.groupAvgIdleRatioPct;
  let groupAvgUtilizationPct = result.groupAvgUtilizationPct;

  if (groupAvgIdleRatioPct === 0 && withTrips.some((m) => m.idleRatioPct > 0)) {
    groupAvgIdleRatioPct = round(
      withTrips.reduce((sum, m) => sum + m.idleRatioPct, 0) / withTrips.length
    );
  }
  if (groupAvgUtilizationPct === 0 && withTrips.some((m) => m.utilizationPct > 0)) {
    groupAvgUtilizationPct = round(
      withTrips.reduce((sum, m) => sum + m.utilizationPct, 0) / withTrips.length
    );
  }

  return { ...result, groupAvgIdleRatioPct, groupAvgUtilizationPct };
}
