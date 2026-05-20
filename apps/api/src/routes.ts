import { Router } from "express";
import { buildDailyHistoryFromRepositories } from "../../../packages/analytics/src/history.js";
import { persistInsights } from "../../../packages/analytics/src/persist-insights.js";
import type {
  ApiAnalyticsQueryResponse,
  ApiChatResponse,
  ApiFleetLocationsResponse,
  ApiInsightsListResponse,
  ApiIntegrationPreviewResponse,
  ApiIntegrationStatusResponse,
  ApiIntegrationSyncResponse,
  ApiTelemetryIngestResponse
} from "../../../packages/shared/src/contracts/api.js";
import { listFleetVehicleLocations } from "../../../packages/telemetry/src/fleet-locations.js";
import type { TelemetryIngestPointInput, VehicleTimelineQueryInput } from "../../../packages/shared/src/contracts/telemetry.js";
import { ApiError } from "./errors.js";
import { analyticsWindowForLookbackDays, type ApiRuntime } from "./runtime.js";
import {
  analyticsQueryBodySchema,
  chatBodySchema,
  integrationBackfillBodySchema,
  integrationSyncBodySchema,
  telemetryIngestBodySchema
} from "./schemas.js";
import type { RequestWithContext } from "./types.js";

function asRequestWithContext(req: unknown): RequestWithContext {
  return req as RequestWithContext;
}

function toTelemetryIngestPointInput(point: ReturnType<typeof telemetryIngestBodySchema.parse>["point"]): TelemetryIngestPointInput {
  const normalized: TelemetryIngestPointInput = {
    vehicleId: point.vehicleId,
    timestamp: point.timestamp,
    latitude: point.latitude,
    longitude: point.longitude,
    source: point.source
  };
  if (point.speedKph !== undefined) normalized.speedKph = point.speedKph;
  if (point.headingDegrees !== undefined) normalized.headingDegrees = point.headingDegrees;
  if (point.engineRpm !== undefined) normalized.engineRpm = point.engineRpm;
  if (point.ignitionOn !== undefined) normalized.ignitionOn = point.ignitionOn;
  if (point.fuelLevelPct !== undefined) normalized.fuelLevelPct = point.fuelLevelPct;
  if (point.odometerKm !== undefined) normalized.odometerKm = point.odometerKm;
  if (point.engineHours !== undefined) normalized.engineHours = point.engineHours;
  return normalized;
}

function toVehicleTimelineQueryInput(vehicleId: string, limit: unknown): VehicleTimelineQueryInput {
  const parsedLimit = typeof limit === "string" ? Number(limit) : undefined;
  return parsedLimit === undefined || Number.isNaN(parsedLimit)
    ? { vehicleId }
    : { vehicleId, telemetryLimit: parsedLimit };
}

export function buildRoutes(runtime: ApiRuntime): Router {
  const router = Router();

  router.post("/v1/telemetry/ingest", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const body = telemetryIngestBodySchema.parse(request.body);
      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const result = await tenantRuntime.telemetryIngestService.ingest({
        point: toTelemetryIngestPointInput(body.point)
      });
      res.status(200).json({ data: result } satisfies ApiTelemetryIngestResponse);
    })().catch(next);
  });

  router.get("/v1/fleet/locations", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const locations = await listFleetVehicleLocations(tenantRuntime.repositories);
      res.status(200).json({ data: locations } satisfies ApiFleetLocationsResponse);
    })().catch(next);
  });

  router.get("/v1/telemetry/vehicles/:vehicleId/timeline", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      if (!request.params.vehicleId) {
        throw new ApiError(400, "MISSING_VEHICLE_ID", "vehicleId path param is required.");
      }
      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const telemetryQuery = toVehicleTimelineQueryInput(request.params.vehicleId, request.query.limit);
      const timeline = await tenantRuntime.vehicleTimelineService.queryVehicleTimeline(telemetryQuery);
      res.status(200).json({ data: timeline });
    })().catch(next);
  });

  router.post("/v1/analytics/query", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const body = analyticsQueryBodySchema.parse(request.body);
      if (body.window.start > body.window.end) {
        throw new ApiError(400, "INVALID_WINDOW", "window.start must be earlier than window.end.");
      }

      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const asOf = body.window.end;
      const kpis = await tenantRuntime.analyticsService.computeKpis({
        tenantId: request.context.tenantId,
        repositories: tenantRuntime.repositories,
        window: body.window,
        asOf
      });
      const engineInput = {
        tenantId: request.context.tenantId,
        repositories: tenantRuntime.repositories,
        window: body.window,
        asOf
      };
      const generatedInsights = tenantRuntime.analyticsService.generateInsights(kpis);
      await persistInsights(tenantRuntime.repositories, generatedInsights);
      const insights = await tenantRuntime.repositories.insights.listRecent(50);
      const history = await buildDailyHistoryFromRepositories(engineInput);
      const forecasts = tenantRuntime.analyticsService.runForecasts(
        engineInput,
        history,
        body.horizonDays ?? 7
      );

      res.status(200).json({
        data: {
          tenantId: request.context.tenantId,
          generatedAt: asOf,
          kpis,
          insights,
          forecasts
        }
      } satisfies ApiAnalyticsQueryResponse);
    })().catch(next);
  });

  router.get("/v1/insights", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : 20;
      const insights = await tenantRuntime.repositories.insights.listRecent(
        Number.isFinite(limit) ? limit : 20
      );
      res.status(200).json({ data: insights } satisfies ApiInsightsListResponse);
    })().catch(next);
  });

  router.get("/v1/integrations/status", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const status = await runtime.fetchIntegrationStatus(request.context.tenantId);
      res.status(200).json({ data: status } satisfies ApiIntegrationStatusResponse);
    })().catch(next);
  });

  router.get("/v1/integrations/preview", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const deviceNameIncludes =
        typeof request.query.deviceNameIncludes === "string" ? request.query.deviceNameIncludes : undefined;
      const deviceExternalIds =
        typeof request.query.deviceExternalIds === "string"
          ? request.query.deviceExternalIds.split(",").map((id) => id.trim()).filter(Boolean)
          : undefined;

      const preview = await runtime.previewIntegrationDevices({
        deviceNameIncludes,
        deviceExternalIds
      });
      const maxDevices =
        preview.matchedDevices > 0 ? Math.min(preview.matchedDevices, 10) : 10;
      const maxPagesPerDevice = 3;
      const pageSize = Number(process.env.FLESPI_MESSAGES_PAGE_SIZE ?? 200);
      res.status(200).json({
        data: {
          ...preview,
          recommendedBackfill: {
            maxDevices,
            lookbackDays: 7,
            maxPagesPerDevice,
            estimatedMaxMessages: maxDevices * maxPagesPerDevice * pageSize
          }
        }
      } satisfies ApiIntegrationPreviewResponse);
    })().catch(next);
  });

  router.post("/v1/integrations/sync", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const body = integrationSyncBodySchema.parse(request.body ?? {});
      const result = await runtime.runIntegrationSync({
        tenantId: request.context.tenantId,
        connector: "partner_api",
        mode: "incremental",
        maxDevices: body.maxDevices ?? 0,
        maxPagesPerDevice: 1,
        deviceExternalIds: body.deviceExternalIds,
        deviceNameIncludes: body.deviceNameIncludes
      });
      const insightsGenerated = await runtime.runAnalyticsAndPersistInsights(request.context.tenantId);
      res.status(200).json({
        data: { status: "completed", connector: "partner_api", result, insightsGenerated: insightsGenerated.length }
      } satisfies ApiIntegrationSyncResponse);
    })().catch(next);
  });

  router.post("/v1/integrations/backfill", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const body = integrationBackfillBodySchema.parse(request.body ?? {});
      const lookbackDays = body.lookbackDays ?? 7;
      const result = await runtime.runIntegrationSync({
        tenantId: request.context.tenantId,
        connector: "partner_api",
        mode: "backfill",
        maxDevices: body.maxDevices,
        lookbackDays,
        maxPagesPerDevice: body.maxPagesPerDevice,
        deviceExternalIds: body.deviceExternalIds,
        deviceNameIncludes: body.deviceNameIncludes,
        idempotencyKey: `backfill-${body.maxDevices ?? "all"}-${lookbackDays}-${body.deviceNameIncludes ?? "all"}`
      });
      const insightsGenerated = await runtime.runAnalyticsAndPersistInsights(
        request.context.tenantId,
        analyticsWindowForLookbackDays(lookbackDays)
      );
      res.status(200).json({
        data: {
          status: "completed",
          connector: "partner_api",
          result,
          insightsGenerated: insightsGenerated.length
        }
      } satisfies ApiIntegrationSyncResponse);
    })().catch(next);
  });

  router.post("/v1/chat", (req, res, next) => {
    (async () => {
      const request = asRequestWithContext(req);
      const body = chatBodySchema.parse(request.body);
      const tenantRuntime = runtime.forTenant(request.context.tenantId);
      const recentInsights = await tenantRuntime.repositories.insights.listRecent(20);
      const response = await runtime.getChatOrchestrator().runTurn(
        {
          conversationId: body.conversationId,
          question: body.question,
          context: {
            tenantId: request.context.tenantId,
            requestId: request.context.requestId,
            userId: request.context.userId,
            now: new Date().toISOString()
          }
        },
        recentInsights
      );

      res.status(200).json({ data: response } satisfies ApiChatResponse);
    })().catch(next);
  });

  return router;
}
