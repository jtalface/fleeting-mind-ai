import type { ExternalVehicle } from "@fleetmind/shared/contracts/integrations.js";

export interface VehicleSelectionFilter {
  /** Flespi device ids (e.g. "6546042"). When set, only these devices are synced. */
  deviceExternalIds?: string[];
  /** Case-insensitive substring match on name, VIN, or external id (e.g. "Sweeper"). */
  deviceNameIncludes?: string;
}

export function filterExternalVehicles(
  vehicles: ExternalVehicle[],
  filter: VehicleSelectionFilter
): ExternalVehicle[] {
  let result = vehicles;

  if (filter.deviceExternalIds && filter.deviceExternalIds.length > 0) {
    const idSet = new Set(filter.deviceExternalIds.map((id) => id.trim()));
    result = result.filter((vehicle) => idSet.has(vehicle.id));
    const order = new Map(filter.deviceExternalIds.map((id, index) => [id.trim(), index]));
    result.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  if (filter.deviceNameIncludes && filter.deviceNameIncludes.trim().length > 0) {
    const needle = filter.deviceNameIncludes.trim().toLowerCase();
    result = result.filter((vehicle) => matchesNameNeedle(vehicle, needle));
  }

  return result;
}

function matchesNameNeedle(vehicle: ExternalVehicle, needle: string): boolean {
  const haystacks = [vehicle.plateNumber, vehicle.vin, vehicle.id, vehicle.make, vehicle.model].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  return haystacks.some((value) => value.toLowerCase().includes(needle));
}

export function applyDeviceCap(vehicles: ExternalVehicle[], maxDevices: number): ExternalVehicle[] {
  if (maxDevices <= 0) {
    return vehicles;
  }
  return vehicles.slice(0, maxDevices);
}
