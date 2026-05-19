import type { RedisOptions } from "ioredis";
import type { WorkerEnv } from "./config.js";

/** Plain Redis client options shared by BullMQ and ioredis command clients. */
export function redisConnectionOptionsFromEnv(config: WorkerEnv): RedisOptions {
  return {
    host: config.redisHost,
    port: config.redisPort,
    ...(config.redisPassword !== undefined ? { password: config.redisPassword } : {}),
    ...(config.redisTls ? { tls: {} } : {})
  };
}
