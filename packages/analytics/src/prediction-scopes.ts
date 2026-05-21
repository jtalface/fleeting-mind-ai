import type { PredictionScopeType } from "@fleetmind/shared/contracts/predictions.js";
import type { TopVehicleByRevenue } from "./top-vehicles-by-revenue.js";

export interface SegmentPredictionScope {
  scopeKey: string;
  nameIncludes: string;
}

export interface PredictionScopeDefinition {
  scopeType: PredictionScopeType;
  scopeKey: string;
  nameIncludes?: string;
  vehicleId?: string;
  /** Human-readable label for vehicle scopes (plate, external id, etc.). */
  scopeLabel?: string;
}

export function fleetScope(): PredictionScopeDefinition {
  return { scopeType: "fleet", scopeKey: "fleet" };
}

export function segmentScopes(segments: SegmentPredictionScope[]): PredictionScopeDefinition[] {
  return segments.map((segment) => ({
    scopeType: "segment" as const,
    scopeKey: segment.scopeKey,
    nameIncludes: segment.nameIncludes
  }));
}

export function vehicleScopes(vehicles: TopVehicleByRevenue[]): PredictionScopeDefinition[] {
  return vehicles.map((vehicle) => ({
    scopeType: "vehicle" as const,
    scopeKey: vehicle.vehicleId,
    vehicleId: vehicle.vehicleId,
    scopeLabel: vehicle.label
  }));
}

export function allPredictionScopes(options: {
  segmentScopes?: SegmentPredictionScope[];
  topVehicles?: TopVehicleByRevenue[];
}): PredictionScopeDefinition[] {
  const segments = options.segmentScopes ?? [];
  const vehicles = options.topVehicles ?? [];
  return [fleetScope(), ...segmentScopes(segments), ...vehicleScopes(vehicles)];
}
