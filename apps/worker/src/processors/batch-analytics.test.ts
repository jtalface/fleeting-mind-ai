import type { Job } from "bullmq";
import type { AnalyticsService } from "@fleetmind/analytics/contracts.js";
import { createInMemoryTenantRepositories } from "@fleetmind/database/repositories/in-memory.js";
import { describe, expect, it, vi } from "vitest";
import { MemoryIdempotencyGuard } from "../idempotency.js";
import type { WorkerRuntime } from "../runtime/types.js";
import { processBatchAnalytics } from "./batch-analytics.js";

const makeJob = (data: unknown): Job =>
  ({ data, timestamp: Date.parse("2026-05-07T12:00:00.000Z"), attemptsMade: 1, opts: { attempts: 3 } }) as Job;

describe("processBatchAnalytics", () => {
  it("skips duplicate logical work when idempotencyKey repeats", async () => {
    const computeKpis = vi.fn().mockResolvedValue(undefined);
    const analytics = {
      computeKpis,
      generateInsights: vi.fn().mockResolvedValue([]),
      runForecasts: vi.fn()
    } satisfies AnalyticsService;

    const runtime: WorkerRuntime = {
      analytics,
      getRepositoriesForTenant: vi.fn().mockReturnValue(createInMemoryTenantRepositories("tenant-1"))
    };

    const guard = new MemoryIdempotencyGuard();
    const payload = {
      tenantId: "tenant-1",
      windowPreset: "explicit" as const,
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: "2026-01-31T23:59:59.000Z",
      asOf: "2026-01-31T23:59:59.000Z",
      idempotencyKey: "daily-rollups"
    };

    await processBatchAnalytics(makeJob(payload), runtime, guard);
    await processBatchAnalytics(makeJob(payload), runtime, guard);

    expect(computeKpis).toHaveBeenCalledTimes(1);
  });

  it("runs without idempotency key on each invocation", async () => {
    const computeKpis = vi.fn().mockResolvedValue(undefined);
    const analytics = {
      computeKpis,
      generateInsights: vi.fn().mockResolvedValue([]),
      runForecasts: vi.fn()
    } satisfies AnalyticsService;

    const runtime: WorkerRuntime = {
      analytics,
      getRepositoriesForTenant: vi.fn().mockReturnValue(createInMemoryTenantRepositories("tenant-1"))
    };

    const guard = new MemoryIdempotencyGuard();
    const payload = {
      tenantId: "tenant-1",
      windowPreset: "explicit" as const,
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: "2026-01-31T23:59:59.000Z",
      asOf: "2026-01-31T23:59:59.000Z"
    };

    await processBatchAnalytics(makeJob(payload), runtime, guard);
    await processBatchAnalytics(makeJob(payload), runtime, guard);

    expect(computeKpis).toHaveBeenCalledTimes(2);
  });
});
