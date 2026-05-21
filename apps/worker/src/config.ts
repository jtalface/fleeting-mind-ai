export interface WorkerEnv {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisTls: boolean;
  schedulerEnabled: boolean;
  /** Comma-separated tenant IDs for repeatable enqueue (optional). */
  scheduledTenantIds: string[];
  /** Rolling UTC window for scheduled batch analytics / hot KPIs (default 7d). */
  scheduledLookbackDays: number;
  /** Rolling UTC window for scheduled forecast refresh / mart training (default 30d). */
  forecastTrainingLookbackDays: number;
  scheduledForecastHorizonDays: number;
  cronBatchAnalytics: string;
  cronForecastRefresh: string;
  cronIntegrationSync: string;
  cronDeepBackfill: string;
  deepBackfillLookbackDays: number;
  deepBackfillDeviceNameIncludes?: string;
  /** JSON array of { scopeKey, nameIncludes } for scheduled forecast refresh. */
  forecastSegmentScopes?: string;
  scheduledForecastTopVehicles: number;
}

const splitCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function loadWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const port = Number(env.REDIS_PORT ?? "6379");
  return {
    redisHost: env.REDIS_HOST ?? "127.0.0.1",
    redisPort: Number.isFinite(port) ? port : 6379,
    ...(env.REDIS_PASSWORD !== undefined ? { redisPassword: env.REDIS_PASSWORD } : {}),
    redisTls: env.REDIS_TLS === "1" || env.REDIS_TLS === "true",
    schedulerEnabled: env.WORKER_SCHEDULER_ENABLED === "1" || env.WORKER_SCHEDULER_ENABLED === "true",
    scheduledTenantIds: splitCsv(env.WORKER_SCHEDULED_TENANT_IDS),
    scheduledLookbackDays: Math.min(90, Math.max(1, Number(env.WORKER_SCHEDULED_LOOKBACK_DAYS ?? "7") || 7)),
    forecastTrainingLookbackDays: Math.min(
      90,
      Math.max(7, Number(env.WORKER_FORECAST_TRAINING_LOOKBACK_DAYS ?? "30") || 30)
    ),
    scheduledForecastHorizonDays: Math.min(
      365,
      Math.max(1, Number(env.WORKER_SCHEDULED_FORECAST_HORIZON_DAYS ?? "7") || 7)
    ),
    cronIntegrationSync: env.WORKER_CRON_INTEGRATION_SYNC ?? "0 */6 * * *",
    cronBatchAnalytics: env.WORKER_CRON_BATCH_ANALYTICS ?? "15 */6 * * *",
    cronForecastRefresh: env.WORKER_CRON_FORECAST_REFRESH ?? "30 */6 * * *",
    cronDeepBackfill: env.WORKER_CRON_DEEP_BACKFILL ?? "0 3 * * 0",
    deepBackfillLookbackDays: Math.min(90, Math.max(7, Number(env.WORKER_DEEP_BACKFILL_LOOKBACK_DAYS ?? "30") || 30)),
    ...(env.WORKER_DEEP_BACKFILL_DEVICE_INCLUDES?.trim()
      ? { deepBackfillDeviceNameIncludes: env.WORKER_DEEP_BACKFILL_DEVICE_INCLUDES.trim() }
      : { deepBackfillDeviceNameIncludes: "Sweeper" }),
    ...(env.WORKER_FORECAST_SEGMENT_SCOPES?.trim()
      ? { forecastSegmentScopes: env.WORKER_FORECAST_SEGMENT_SCOPES.trim() }
      : {}),
    scheduledForecastTopVehicles: Math.min(
      50,
      Math.max(0, Number(env.WORKER_FORECAST_TOP_VEHICLES ?? "5") || 5)
    )
  };
}
