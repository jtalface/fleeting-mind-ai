import type { TelemetryPoint, Trip } from "./domain.js";

export interface TelemetryIngestPointInput extends Omit<TelemetryPoint, "tenantId"> {}

export interface TelemetryIngestInput {
  point: TelemetryIngestPointInput;
  /** Bulk sync: skip per-point trip rebuild (run once per vehicle after pages). */
  skipTripConstruction?: boolean;
}

export interface TelemetryIngestResult {
  telemetryPoint: TelemetryPoint;
  deduplicated: boolean;
  createdTrips: Trip[];
}

export interface VehicleTimelineQueryInput {
  vehicleId: string;
  telemetryLimit?: number;
}

export interface VehicleTimeline {
  vehicleId: string;
  telemetryPoints: TelemetryPoint[];
  trips: Trip[];
}
