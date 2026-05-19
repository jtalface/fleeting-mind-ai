import { describe, expect, it } from "vitest";
import { MemoryIdempotencyGuard } from "./idempotency.js";

describe("MemoryIdempotencyGuard", () => {
  it("allows the first acquire and blocks duplicates", async () => {
    const guard = new MemoryIdempotencyGuard();
    await expect(guard.tryAcquire("tenant-a:key-1")).resolves.toBe(true);
    await expect(guard.tryAcquire("tenant-a:key-1")).resolves.toBe(false);
  });

  it("uses distinct keys per tenant", async () => {
    const guard = new MemoryIdempotencyGuard();
    await expect(guard.tryAcquire("t1:k")).resolves.toBe(true);
    await expect(guard.tryAcquire("t2:k")).resolves.toBe(true);
  });
});
