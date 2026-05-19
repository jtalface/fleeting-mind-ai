import type { AnalyticsService } from "@fleetmind/analytics/contracts.js";
import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { IntegrationSyncResult } from "@fleetmind/shared/contracts/integrations.js";
import type { IntegrationSyncJobPayload } from "@fleetmind/shared/contracts/jobs.js";

export interface WorkerRuntime {
  readonly analytics: AnalyticsService;
  getRepositoriesForTenant(tenantId: string): TenantRepositorySet;
  disconnect?: () => Promise<void>;
}

export interface IntegrationSyncRunner {
  run(payload: IntegrationSyncJobPayload): Promise<IntegrationSyncResult>;
}
