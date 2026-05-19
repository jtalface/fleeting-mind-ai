import type { Redis as RedisClient } from "ioredis";

export interface IdempotencyGuard {
  tryAcquire(key: string): Promise<boolean>;
}

/** In-memory guard for unit tests (process-local only). */
export class MemoryIdempotencyGuard implements IdempotencyGuard {
  private readonly seen = new Set<string>();

  public async tryAcquire(key: string): Promise<boolean> {
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.add(key);
    return true;
  }
}

/**
 * Redis SET NX EX — duplicate logical jobs (same tenant + idempotency key) are skipped.
 * Retries of the same BullMQ job still run unless you pass an idempotency key derived from stable business identity.
 */
export class RedisIdempotencyGuard implements IdempotencyGuard {
  public constructor(
    private readonly redis: RedisClient,
    private readonly keyPrefix: string,
    private readonly ttlSeconds: number
  ) {}

  public async tryAcquire(key: string): Promise<boolean> {
    const redisKey = `${this.keyPrefix}${key}`;
    const result = await this.redis.set(redisKey, "1", "EX", this.ttlSeconds, "NX");
    return result === "OK";
  }
}
