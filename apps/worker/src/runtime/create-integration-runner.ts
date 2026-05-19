import { PartnerApiSyncRunner, resolveMetricsApiClient } from "@fleetmind/integrations";
import type { IntegrationSyncRunner } from "./types.js";
import { NoopIntegrationSyncRunner } from "./default-integration-sync.js";
import type { WorkerRuntime } from "./types.js";

export function createIntegrationSyncRunner(runtime: WorkerRuntime): IntegrationSyncRunner {
  const apiClient = resolveMetricsApiClient();

  if (!apiClient) {
    return new NoopIntegrationSyncRunner();
  }

  return new PartnerApiSyncRunner({
    getRepositoriesForTenant: (tenantId) => runtime.getRepositoriesForTenant(tenantId),
    apiClient
  });
}
