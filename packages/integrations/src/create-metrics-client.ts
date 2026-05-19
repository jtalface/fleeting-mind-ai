import {
  createFleetMetricsApiClient,
  createFlespiApiClient,
  MockFleetMetricsApiClient,
  type FleetMetricsApiClient
} from "./client/fleet-metrics-api-client.js";
import {
  loadFleetMetricsApiConfig,
  loadFlespiConfig,
  resolveIntegrationsProvider
} from "./config.js";
import { devMockTelemetry, devMockVehicles } from "./dev-mock-fixtures.js";

/** Resolves the active telematics client (Flespi or generic HTTP). No dev fallback. */
export function createMetricsApiClient(env: NodeJS.ProcessEnv = process.env): FleetMetricsApiClient | null {
  const provider = resolveIntegrationsProvider(env);
  if (provider === "flespi") {
    return createFlespiApiClient(loadFlespiConfig(env));
  }
  return createFleetMetricsApiClient(loadFleetMetricsApiConfig(env));
}

/**
 * Same as createMetricsApiClient, but in development uses a local mock when no token/API is configured.
 * Use this for preview/sync in local dev.
 */
export function resolveMetricsApiClient(env: NodeJS.ProcessEnv = process.env): FleetMetricsApiClient | null {
  const configured = createMetricsApiClient(env);
  if (configured) {
    return configured;
  }
  if (env.NODE_ENV === "development") {
    return new MockFleetMetricsApiClient({ vehicles: devMockVehicles, telemetry: devMockTelemetry });
  }
  return null;
}
