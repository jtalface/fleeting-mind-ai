import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";

export type FleetVehicleLocationStatus = "moving" | "idle" | "offline";

export interface FleetVehicleLocation {
  vehicleId: string;
  plateNumber?: string;
  externalId?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speedKph?: number;
  status: FleetVehicleLocationStatus;
}

export interface FleetLocationsResult {
  vehicleCount: number;
  locatedCount: number;
  vehicles: FleetVehicleLocation[];
}

function resolveStatus(speedKph: number | undefined): FleetVehicleLocationStatus {
  if (speedKph === undefined) {
    return "idle";
  }
  return speedKph > 5 ? "moving" : "idle";
}

export async function listFleetVehicleLocations(
  repositories: TenantRepositorySet
): Promise<FleetLocationsResult> {
  const fleet = await repositories.vehicles.list();
  const located: FleetVehicleLocation[] = [];

  await Promise.all(
    fleet.map(async (vehicle) => {
      const latest = (await repositories.telemetry.listByVehicle(vehicle.id, 1))[0];
      if (!latest) {
        return;
      }

      located.push({
        vehicleId: vehicle.id,
        ...(vehicle.plateNumber ? { plateNumber: vehicle.plateNumber } : {}),
        ...(vehicle.externalId ? { externalId: vehicle.externalId } : {}),
        latitude: latest.latitude,
        longitude: latest.longitude,
        timestamp: latest.timestamp,
        ...(latest.speedKph !== undefined ? { speedKph: latest.speedKph } : {}),
        status: resolveStatus(latest.speedKph)
      });
    })
  );

  located.sort((a, b) => (a.plateNumber ?? a.vehicleId).localeCompare(b.plateNumber ?? b.vehicleId));

  return {
    vehicleCount: fleet.length,
    locatedCount: located.length,
    vehicles: located
  };
}
