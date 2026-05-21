import { AgentOrchestrator } from "../../../packages/ai-core/src/orchestrator.js";
import { InMemoryConversationMemory } from "../../../packages/ai-core/src/memory.js";
import { ToolRegistry } from "../../../packages/ai-core/src/tool-registry.js";
import { persistInsights } from "../../../packages/analytics/src/persist-insights.js";
import { createInsightGenerator } from "../../../packages/ai-core/src/generate-llm-insights.js";
import { buildInsightGenerationContext } from "../../../packages/analytics/src/insight-context.js";
import { DefaultAnalyticsService } from "../../../packages/analytics/src/service.js";
import { computeVehicleGroupMetrics } from "../../../packages/analytics/src/vehicle-group-metrics.js";
import { buildDailyHistoryFromRepositories } from "../../../packages/analytics/src/history.js";
import type { Insight } from "../../../packages/shared/src/contracts/domain.js";
import { createInMemoryTenantRepositories } from "../../../packages/database/src/repositories/in-memory.js";
import { createPrismaTenantRepositories } from "../../../packages/database/src/repositories/prisma.js";
import type { PrismaDbClient } from "../../../packages/database/src/repositories/prisma.js";
import type { TenantRepositorySet } from "../../../packages/database/src/repositories/contracts.js";
import {
  isFleetMetricsApiConfigured,
  PartnerApiSyncRunner,
  resolveMetricsApiClient,
  type FleetMetricsApiClient
} from "../../../packages/integrations/src/index.js";
import { isDatabaseUnavailableError } from "./database-errors.js";
import { ApiError } from "./errors.js";
import { createTelemetryIngestService } from "../../../packages/telemetry/src/ingest-service.js";
import { createVehicleTimelineService } from "../../../packages/telemetry/src/timeline-service.js";
import type { IntegrationSyncResult } from "../../../packages/shared/src/contracts/integrations.js";
import type { IntegrationSyncJobPayload } from "../../../packages/shared/src/contracts/jobs.js";
import { createCopilotResponder } from "./create-copilot-responder.js";
import type { ApiRuntimeOptions } from "./create-runtime.js";

export interface TenantRuntime {
  repositories: TenantRepositorySet;
  telemetryIngestService: ReturnType<typeof createTelemetryIngestService>;
  vehicleTimelineService: ReturnType<typeof createVehicleTimelineService>;
  analyticsService: DefaultAnalyticsService;
}

const nowIso = (): string => new Date().toISOString();

export const analyticsWindowForLookbackDays = (lookbackDays: number): { start: string; end: string } => {
  const end = nowIso();
  return {
    start: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
    end
  };
};

const defaultWindow = (): { start: string; end: string } => analyticsWindowForLookbackDays(7);

export class ApiRuntime {
  private readonly tenants = new Map<string, TenantRuntime>();
  private readonly analyticsService = new DefaultAnalyticsService(createInsightGenerator());
  private readonly memory = new InMemoryConversationMemory();
  private readonly registry = new ToolRegistry();
  private readonly orchestrator: AgentOrchestrator;
  private readonly options: ApiRuntimeOptions;
  private integrationRunner: PartnerApiSyncRunner | null = null;
  private readonly metricsApiClient: FleetMetricsApiClient | null;
  private readonly syncInFlight = new Map<string, Promise<IntegrationSyncResult>>();

  public constructor(options: ApiRuntimeOptions) {
    this.options = options;
    this.registerDefaultTools();
    this.orchestrator = new AgentOrchestrator({
      registry: this.registry,
      memory: this.memory,
      responder: createCopilotResponder()
    });
    this.metricsApiClient = resolveMetricsApiClient();
    this.bootstrapIntegrationRunner();
  }

  private requireMetricsClient(): FleetMetricsApiClient {
    if (!this.metricsApiClient) {
      throw new ApiError(
        503,
        "TELEMATICS_NOT_CONFIGURED",
        "Telematics is not configured. Set FLESPI_TOKEN in .env (see .env.example) and restart the API."
      );
    }
    return this.metricsApiClient;
  }

  public forTenant(tenantId: string): TenantRuntime {
    const existing = this.tenants.get(tenantId);
    if (existing) {
      return existing;
    }

    const repositories =
      this.options.storage === "prisma"
        ? createPrismaTenantRepositories(tenantId, this.options.prisma)
        : createInMemoryTenantRepositories(tenantId);

    const runtime: TenantRuntime = {
      repositories,
      telemetryIngestService: createTelemetryIngestService(repositories),
      vehicleTimelineService: createVehicleTimelineService(repositories),
      analyticsService: this.analyticsService
    };

    if (this.options.storage === "memory") {
      this.seedTenant(repositories).catch(() => {
        /* best-effort demo seed */
      });
    }

    this.tenants.set(tenantId, runtime);
    return runtime;
  }

  public getChatOrchestrator(): AgentOrchestrator {
    return this.orchestrator;
  }

  public async runAnalyticsAndPersistInsights(
    tenantId: string,
    window: { start: string; end: string } = defaultWindow()
  ): Promise<Insight[]> {
    const tenantRuntime = this.forTenant(tenantId);
    const engineInput = {
      tenantId,
      repositories: tenantRuntime.repositories,
      window,
      asOf: window.end
    };
    const kpis = await tenantRuntime.analyticsService.computeKpis(engineInput);
    const history = await buildDailyHistoryFromRepositories(engineInput);
    const forecasts = tenantRuntime.analyticsService.runForecasts(engineInput, history, 7);
    const generated = await tenantRuntime.analyticsService.generateInsights(
      kpis,
      buildInsightGenerationContext(forecasts)
    );
    return persistInsights(tenantRuntime.repositories, generated);
  }

  public async runIntegrationSync(payload: IntegrationSyncJobPayload): Promise<IntegrationSyncResult> {
    if (!this.integrationRunner) {
      throw new ApiError(
        503,
        "TELEMATICS_NOT_CONFIGURED",
        "Telematics is not configured. Set FLESPI_TOKEN in .env and restart the API."
      );
    }
    const lockKey = `${payload.tenantId}:${payload.connector}`;
    if (this.syncInFlight.has(lockKey)) {
      throw new ApiError(
        409,
        "SYNC_IN_PROGRESS",
        "An integration sync is already running for this tenant. Wait for it to finish before starting another."
      );
    }

    const runPromise = this.integrationRunner.run(payload).finally(() => {
      this.syncInFlight.delete(lockKey);
    });
    this.syncInFlight.set(lockKey, runPromise);
    return runPromise;
  }

  public async previewIntegrationDevices(filter?: {
    deviceExternalIds?: string[];
    deviceNameIncludes?: string;
  }): Promise<{
    totalDevices: number;
    matchedDevices: number;
    sample: Array<{ id: string; name?: string; vin?: string }>;
    matched: Array<{ id: string; name?: string; vin?: string }>;
  }> {
    const client = this.requireMetricsClient();
    const { filterExternalVehicles } = await import(
      "../../../packages/integrations/src/sync/vehicle-filter.js"
    );
    const vehicles = await client.listVehicles();
    const matched = filterExternalVehicles(vehicles, {
      deviceExternalIds: filter?.deviceExternalIds,
      deviceNameIncludes: filter?.deviceNameIncludes
    });
    const mapVehicle = (v: (typeof vehicles)[number]) => ({
      id: v.id,
      ...(v.plateNumber ? { name: v.plateNumber } : {}),
      ...(v.vin ? { vin: v.vin } : {})
    });
    return {
      totalDevices: vehicles.length,
      matchedDevices: matched.length,
      sample: vehicles.slice(0, 10).map(mapVehicle),
      matched: matched.slice(0, 50).map(mapVehicle)
    };
  }

  public async fetchIntegrationStatus(tenantId: string): Promise<{
    configured: boolean;
    connector: string;
    databaseAvailable: boolean;
    lastStatus?: string;
    lastSyncedAt?: string;
    lastError?: string;
    cursor?: string;
  }> {
    const base = {
      configured: isFleetMetricsApiConfigured(),
      connector: "partner_api" as const,
      databaseAvailable: this.options.storage === "memory"
    };

    if (this.options.storage === "memory") {
      return base;
    }

    try {
      const tenantRuntime = this.forTenant(tenantId);
      const syncRepo = tenantRuntime.repositories.integrationSync;
      const state = syncRepo ? await syncRepo.get("partner_api") : null;
      return {
        ...base,
        databaseAvailable: true,
        ...(state?.lastStatus ? { lastStatus: state.lastStatus } : {}),
        ...(state?.lastSyncedAt ? { lastSyncedAt: state.lastSyncedAt } : {}),
        ...(state?.lastError && state.lastStatus !== "ok" ? { lastError: state.lastError } : {}),
        ...(state?.cursor ? { cursor: state.cursor } : {})
      };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return { ...base, databaseAvailable: false };
      }
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.options.storage === "prisma") {
      await this.options.prisma.$disconnect();
    }
  }

  private bootstrapIntegrationRunner(): void {
    if (!this.metricsApiClient) {
      return;
    }

    this.integrationRunner = new PartnerApiSyncRunner({
      getRepositoriesForTenant: (tenantId) => this.forTenant(tenantId).repositories,
      apiClient: this.metricsApiClient
    });
  }

  private registerDefaultTools(): void {
    this.registry.register("get_vehicle_snapshot", async (request) => {
      const runtime = this.forTenant(request.context.tenantId);
      const vehicles = await runtime.repositories.vehicles.list();
      if (vehicles.length === 0) {
        return {
          toolName: "get_vehicle_snapshot",
          ok: true,
          observedAt: request.context.now,
          citations: ["fleet:empty"],
          data: { status: "offline" as const, vehicleCount: 0, vehicles: [] }
        };
      }

      const snapshots = await Promise.all(
        vehicles.slice(0, 15).map(async (vehicle) => {
          const latest = (await runtime.repositories.telemetry.listByVehicle(vehicle.id, 1))[0];
          return {
            vehicleId: vehicle.id,
            plateNumber: vehicle.plateNumber,
            externalId: vehicle.externalId,
            status:
              latest && (latest.speedKph ?? 0) > 5
                ? ("moving" as const)
                : latest
                  ? ("idle" as const)
                  : ("offline" as const),
            latestTelemetryAt: latest?.timestamp,
            odometerKm: latest?.odometerKm,
            fuelLevelPct: latest?.fuelLevelPct
          };
        })
      );

      const movingCount = snapshots.filter((s) => s.status === "moving").length;
      const idleCount = snapshots.filter((s) => s.status === "idle").length;

      return {
        toolName: "get_vehicle_snapshot",
        ok: true,
        observedAt: request.context.now,
        citations: ["fleet:vehicles", "telemetry:latest"],
        data: {
          vehicleCount: vehicles.length,
          movingCount,
          idleCount,
          vehicles: snapshots
        }
      };
    });

    this.registry.register("get_vehicle_group_metrics", async (request) => {
      const nameIncludes =
        typeof request.input === "object" &&
        request.input &&
        "nameIncludes" in request.input &&
        typeof (request.input as { nameIncludes?: unknown }).nameIncludes === "string"
          ? String((request.input as { nameIncludes: string }).nameIncludes)
          : "Sweeper";

      const runtime = this.forTenant(request.context.tenantId);
      const window = defaultWindow();
      const data = await computeVehicleGroupMetrics({
        tenantId: request.context.tenantId,
        repositories: runtime.repositories,
        asOf: request.context.now,
        window,
        nameIncludes
      });

      return {
        toolName: "get_vehicle_group_metrics",
        ok: true,
        observedAt: request.context.now,
        citations: ["analytics:vehicle_group", `filter:${nameIncludes}`],
        data
      };
    });

    this.registry.register("get_profitability_summary", async (request) => {
      const runtime = this.forTenant(request.context.tenantId);
      const window = defaultWindow();
      const snapshot = await runtime.analyticsService.computeKpis({
        tenantId: request.context.tenantId,
        repositories: runtime.repositories,
        asOf: request.context.now,
        window
      });

      return {
        toolName: "get_profitability_summary",
        ok: true,
        observedAt: request.context.now,
        citations: ["analytics:kpis:last_7_days"],
        data: snapshot
      };
    });

    this.registry.register("get_operational_efficiency", async (request) => {
      const runtime = this.forTenant(request.context.tenantId);
      const window = defaultWindow();
      const snapshot = await runtime.analyticsService.computeKpis({
        tenantId: request.context.tenantId,
        repositories: runtime.repositories,
        asOf: request.context.now,
        window
      });
      const utilization = snapshot.fleetMetrics.find((m) => m.metricKey === "utilization_pct")?.value;
      const idle = snapshot.fleetMetrics.find((m) => m.metricKey === "idle_ratio_pct")?.value;

      return {
        toolName: "get_operational_efficiency",
        ok: true,
        observedAt: request.context.now,
        citations: ["analytics:efficiency:last_7_days"],
        data: { utilizationPct: utilization, idleRatioPct: idle }
      };
    });

    this.registry.register("get_forecast", async (request) => {
      const raw = typeof request.input === "object" && request.input ? request.input : {};
      const horizonDays = Number((raw as { horizonDays?: unknown }).horizonDays ?? 7);
      const nameIncludes =
        typeof (raw as { nameIncludes?: unknown }).nameIncludes === "string"
          ? (raw as { nameIncludes: string }).nameIncludes
          : undefined;
      const runtime = this.forTenant(request.context.tenantId);
      const window = defaultWindow();
      const input = {
        tenantId: request.context.tenantId,
        repositories: runtime.repositories,
        asOf: request.context.now,
        window
      };
      const segmentFilter = nameIncludes ? { nameIncludes } : undefined;
      const history = await buildDailyHistoryFromRepositories(input, 90, segmentFilter);
      const clampedHorizon = Math.max(1, Math.min(30, horizonDays));

      const cached = runtime.repositories.predictionRuns
        ? await runtime.repositories.predictionRuns.listLatest({
            horizonDays: clampedHorizon,
            ...(nameIncludes ? { scopeType: "segment" as const, scopeKey: nameIncludes } : { scopeType: "fleet" as const, scopeKey: "fleet" })
          })
        : [];

      if (cached.length > 0) {
        const { bundlesFromRuns } = await import("../../../packages/analytics/src/persist-predictions.js");
        return {
          toolName: "get_forecast",
          ok: true,
          observedAt: request.context.now,
          citations: ["predictions:cache"],
          data: bundlesFromRuns(cached).map((bundle) => ({
            tenantId: bundle.tenantId,
            metricKey: bundle.metricKey,
            trainedUntil: bundle.trainedUntil,
            horizonDays: bundle.horizonDays,
            predictedPoints: bundle.predictedPoints,
            explanation: bundle.explanation
          }))
        };
      }

      return {
        toolName: "get_forecast",
        ok: true,
        observedAt: request.context.now,
        citations: ["analytics:forecast:revenue"],
        data: runtime.analyticsService.runForecasts(input, history, clampedHorizon)
      };
    });

    this.registry.register("list_open_maintenance", async (request) => {
      const runtime = this.forTenant(request.context.tenantId);
      return {
        toolName: "list_open_maintenance",
        ok: true,
        observedAt: request.context.now,
        citations: ["maintenance:open"],
        data: await runtime.repositories.maintenance.listOpen()
      };
    });

    this.registry.register("list_recent_insights", async (request) => {
      const runtime = this.forTenant(request.context.tenantId);
      const insights = await runtime.repositories.insights.listRecent(20);
      return {
        toolName: "list_recent_insights",
        ok: true,
        observedAt: request.context.now,
        citations: ["insights:recent"],
        data: insights
      };
    });

    this.registry.register("get_integration_status", async (request) => {
      const status = await this.fetchIntegrationStatus(request.context.tenantId);
      return {
        toolName: "get_integration_status",
        ok: true,
        observedAt: request.context.now,
        citations: ["integration:status"],
        data: status
      };
    });
  }

  private async seedTenant(repositories: TenantRepositorySet): Promise<void> {
    const existingVehicles = await repositories.vehicles.list();
    if (existingVehicles.length > 0) {
      return;
    }

    const vehicle = await repositories.vehicles.create({
      vin: "1HGBH41JXMN109186",
      plateNumber: "FM-001",
      class: "truck",
      make: "FleetMind",
      model: "M1",
      year: 2024,
      odometerKm: 9000,
      active: true
    });

    await repositories.trips.create({
      vehicleId: vehicle.id,
      startTime: "2026-05-01T09:00:00.000Z",
      endTime: "2026-05-01T11:00:00.000Z",
      startOdometerKm: 9000,
      endOdometerKm: 9125,
      distanceKm: 125,
      idleMinutes: 15,
      averageSpeedKph: 62.5
    });

    await repositories.fuel.create({
      vehicleId: vehicle.id,
      timestamp: nowIso(),
      volumeLiters: 90,
      totalCost: 140,
      currency: "USD",
      source: "manual",
      stationName: "Fleet Fuel Hub"
    });
  }
}
