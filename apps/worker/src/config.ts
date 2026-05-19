export interface WorkerEnv {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisTls: boolean;
  schedulerEnabled: boolean;
  /** Comma-separated tenant IDs for repeatable enqueue (optional). */
  scheduledTenantIds: string[];
  cronBatchAnalytics: string;
  cronForecastRefresh: string;
  cronIntegrationSync: string;
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
    cronBatchAnalytics: env.WORKER_CRON_BATCH_ANALYTICS ?? "0 */6 * * *",
    cronForecastRefresh: env.WORKER_CRON_FORECAST_REFRESH ?? "15 */6 * * *",
    cronIntegrationSync: env.WORKER_CRON_INTEGRATION_SYNC ?? "30 */6 * * *"
  };
}
