import { z } from "zod";

/** Logical BullMQ queue names (single Redis deployment, multiple queues). */
export const JOB_QUEUE_NAMES = {
  BATCH_ANALYTICS: "fleetmind-batch-analytics",
  FORECAST_REFRESH: "fleetmind-forecast-refresh",
  INTEGRATION_SYNC: "fleetmind-integration-sync",
  DEAD_LETTER: "fleetmind-dead-letter"
} as const;

export type JobQueueName = (typeof JOB_QUEUE_NAMES)[keyof typeof JOB_QUEUE_NAMES];

const tenantScopedJobBaseSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().optional(),
  /** When set, duplicate logical work for the same tenant is skipped (separate from BullMQ retries). */
  idempotencyKey: z.string().min(1).optional()
});

const windowPresetSchema = z.enum(["explicit", "last_24h_utc", "last_7d_utc"]);

export const batchAnalyticsJobPayloadSchema = tenantScopedJobBaseSchema.extend({
  asOf: z.string(),
  windowPreset: windowPresetSchema.default("explicit"),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.windowPreset === "explicit") {
    if (!value.windowStart || !value.windowEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "windowStart and windowEnd are required when windowPreset is explicit",
        path: ["windowStart"]
      });
    }
  }
});

export type BatchAnalyticsJobPayload = z.infer<typeof batchAnalyticsJobPayloadSchema>;

const segmentScopeSchema = z.object({
  scopeKey: z.string().min(1),
  nameIncludes: z.string().min(1)
});

export const forecastRefreshJobPayloadSchema = tenantScopedJobBaseSchema.extend({
  asOf: z.string(),
  horizonDays: z.number().int().positive().max(365),
  windowPreset: windowPresetSchema.default("explicit"),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  segmentScopes: z.array(segmentScopeSchema).optional()
}).superRefine((value, ctx) => {
  if (value.windowPreset === "explicit") {
    if (!value.windowStart || !value.windowEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "windowStart and windowEnd are required when windowPreset is explicit",
        path: ["windowStart"]
      });
    }
  }
});

export type ForecastRefreshJobPayload = z.infer<typeof forecastRefreshJobPayloadSchema>;

export const integrationConnectorSchema = z.enum(["partner_api", "fleet_csv", "manual_upload"]);

export const integrationSyncJobPayloadSchema = tenantScopedJobBaseSchema.extend({
  connector: integrationConnectorSchema,
  cursor: z.string().optional(),
  mode: z.enum(["incremental", "backfill"]).optional(),
  maxDevices: z.number().int().min(0).max(500).optional(),
  lookbackDays: z.number().int().min(1).max(90).optional(),
  maxPagesPerDevice: z.number().int().min(1).max(50).optional(),
  deviceExternalIds: z.array(z.string().min(1)).optional(),
  deviceNameIncludes: z.string().min(1).optional()
});

export type IntegrationSyncJobPayload = z.infer<typeof integrationSyncJobPayloadSchema>;
