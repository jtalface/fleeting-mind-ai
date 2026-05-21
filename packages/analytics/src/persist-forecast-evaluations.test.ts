import { describe, expect, it, vi } from "vitest";
import { persistForecastEvaluations } from "./persist-forecast-evaluations.js";
import type { ScopedForecastBatch } from "./run-batch-predictions.js";

describe("persistForecastEvaluations", () => {
  it("persists holdout quality metrics with scope", async () => {
    const upsert = vi.fn(async (record: { evaluationKind: string; scopeType: string }) => ({
      id: "feval_1",
      createdAt: "2026-05-21T00:00:00.000Z",
      ...record,
      mae: 1,
      mapePct: 10,
      withinBandPct: 50,
      sampleSize: 8,
      algorithm: "ets",
      trainedUntil: "2026-05-21T00:00:00.000Z",
      horizonDays: 7,
      metricKey: "revenue",
      scopeKey: "fleet",
      tenantId: "tenant_demo"
    }));
    const repositories = {
      forecastEvaluations: { upsert, listRecent: vi.fn(), listTrends: vi.fn() }
    };

    const batches: ScopedForecastBatch[] = [
      {
        scope: { scopeType: "fleet", scopeKey: "fleet" },
        forecasts: [
          {
            tenantId: "tenant_demo",
            metricKey: "revenue",
            trainedUntil: "2026-05-21T00:00:00.000Z",
            horizonDays: 7,
            predictedPoints: [
              {
                date: "2026-05-22",
                p10: 0,
                p50: 100,
                p90: 120,
                value: 100,
                lowerBound: 0,
                upperBound: 120
              }
            ],
            explanation: {
              algorithm: "ets",
              sampleSize: 8,
              residualStdDev: 5,
              championSelected: true,
              backtestMapePct: 12
            }
          }
        ]
      }
    ];

    await persistForecastEvaluations(repositories as never, batches);
    expect(upsert).toHaveBeenCalled();
    const record = upsert.mock.calls[0]?.[0];
    expect(record.scopeType).toBe("fleet");
    expect(record.evaluationKind).toBe("holdout");
    expect(record.mapePct).toBeGreaterThanOrEqual(0);
  });
});
