export interface TelemetryPackageBoundary {
  owns: ["ingestion_validators", "deduplication", "trip_construction", "telemetry_storage"];
  exposes: ["ingest_telemetry", "query_vehicle_timeline"];
  mustNotImport: ["@fleetmind/ai-core", "@fleetmind/web"];
}

export * from "./validation.js";
export * from "./trip-builder.js";
export * from "./ingest-service.js";
export * from "./timeline-service.js";
