import type { TelemetryPoint, Trip } from "./domain.js";
export interface TelemetryIngestPointInput extends Omit<TelemetryPoint, "tenantId"> {
}
export interface TelemetryIngestInput {
    point: TelemetryIngestPointInput;
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
//# sourceMappingURL=telemetry.d.ts.map