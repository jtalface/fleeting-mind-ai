export interface IntegrationsPackageBoundary {
  owns: ["vendor_adapters", "auth_tokens", "retry_policies", "rate_limits"];
  exposes: ["sync_vendor_data", "fetch_external_records"];
  mustNotImport: ["@fleetmind/api", "@fleetmind/web"];
}

export * from "./config.js";
export * from "./client/fleet-metrics-api-client.js";
export * from "./client/flespi-api-client.js";
export * from "./create-metrics-client.js";
export * from "./sync/vehicle-metrics-sync-service.js";
export * from "./sync/sync-options.js";
export * from "./sync/vehicle-filter.js";
export * from "./sync/partner-api-sync-runner.js";
