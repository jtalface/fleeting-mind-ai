import type { ExternalTelemetry, ExternalVehicle } from "@fleetmind/shared/contracts/integrations.js";

export const devMockVehicles: ExternalVehicle[] = [
  {
    id: "ext-vehicle-1",
    vin: "1HGBH41JXMN109186",
    plateNumber: "Sweeper 7301",
    vehicleClass: "truck",
    active: true
  },
  {
    id: "ext-vehicle-2",
    vin: "41029001",
    plateNumber: "41029001",
    vehicleClass: "other",
    active: true
  }
];

export const devMockTelemetry: ExternalTelemetry[] = [
  {
    vehicleId: "ext-vehicle-1",
    timestamp: new Date().toISOString(),
    latitude: 37.7749,
    longitude: -122.4194,
    speedKph: 45,
    fuelLevelPct: 72,
    ignitionOn: true
  }
];
