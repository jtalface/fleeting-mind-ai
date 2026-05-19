import * as PrismaClientPackage from "@prisma/client";
import { Redis } from "ioredis";
import type { PrismaDbClient } from "@fleetmind/database/repositories/prisma.js";
import { loadWorkerEnv } from "./config.js";
import { redisConnectionOptionsFromEnv } from "./connection.js";
import { createFleetMindQueues } from "./queues.js";
import { registerScheduledJobs } from "./scheduler.js";
import { createDefaultWorkerRuntime } from "./runtime/default-runtime.js";
import { createIntegrationSyncRunner } from "./runtime/create-integration-runner.js";
import { createFleetMindWorkers } from "./workers.js";

type WorkerPrismaClient = PrismaDbClient & { $disconnect(): Promise<void> };
const { PrismaClient } = PrismaClientPackage as unknown as { PrismaClient: new () => WorkerPrismaClient };

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const connection = redisConnectionOptionsFromEnv(env);
  const redis = new Redis(connection);

  const prisma = new PrismaClient();
  const runtime = createDefaultWorkerRuntime(prisma);
  const integrationRunner = createIntegrationSyncRunner(runtime);

  const queues = createFleetMindQueues(connection);
  const workers = createFleetMindWorkers(connection, queues, runtime, integrationRunner, redis);

  const stopScheduler = await registerScheduledJobs(queues, env);

  const shutdown = async (signal: string) => {
    console.warn(`Worker received ${signal}, closing…`);
    await stopScheduler();
    await workers.close();
    await Promise.all([
      queues.batchAnalytics.close(),
      queues.forecastRefresh.close(),
      queues.integrationSync.close(),
      queues.deadLetter.close()
    ]);
    redis.disconnect();
    if (runtime.disconnect) {
      await runtime.disconnect();
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.warn(
    `Fleet Mind worker online (scheduler: ${env.schedulerEnabled ? "enabled" : "disabled"}, tenants: ${env.scheduledTenantIds.length})`
  );

  void workers;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
