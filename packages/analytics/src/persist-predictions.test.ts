import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "../../database/src/repositories/in-memory.js";
import { fleetScope } from "./prediction-scopes.js";
import { bundlesFromRuns, persistPredictionBatches } from "./persist-predictions.js";
import type { ScopedForecastBatch } from "./run-batch-predictions.js";

describe("persistPredictionBatches", () => {
  it("stores and lists latest fleet revenue prediction", async () => {
    const repositories = createInMemoryTenantRepositories("tenant_demo");
    const batch: ScopedForecastBatch = {
      scope: fleetScope(),
      forecasts: [
        {
          tenantId: "tenant_demo",
          metricKey: "revenue",
          trainedUntil: "2026-05-14T00:00:00.000Z",
          horizonDays: 7,
          predictedPoints: [
            {
              date: "2026-05-15",
              p10: 900,
              p50: 1000,
              p90: 1100,
              value: 1000,
              lowerBound: 900,
              upperBound: 1100
            }
          ],
          explanation: {
            algorithm: "ets",
            sampleSize: 10,
            residualStdDev: 50,
            championSelected: true
          }
        }
      ]
    };

    await persistPredictionBatches(repositories, [batch]);
    const runs = await repositories.predictionRuns!.listLatest({ horizonDays: 7 });
    const bundles = bundlesFromRuns(runs);
    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.scopeType).toBe("fleet");
    expect(bundles[0]?.predictedPoints[0]?.p50).toBe(1000);
  });
});
