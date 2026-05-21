import { describe, expect, it } from "vitest";
import { scoreForwardAccuracyForRun } from "./forward-accuracy.js";
import type { PredictionRunStored } from "../../database/src/repositories/contracts.js";

describe("scoreForwardAccuracyForRun", () => {
  it("scores realized forecast days against actuals", () => {
    const run: PredictionRunStored = {
      id: "run_1",
      tenantId: "tenant_demo",
      scopeType: "fleet",
      scopeKey: "fleet",
      metricKey: "revenue",
      algorithm: "ets",
      trainedUntil: "2026-05-10T00:00:00.000Z",
      horizonDays: 7,
      sampleSize: 8,
      championSelected: true,
      explanation: { algorithm: "ets", sampleSize: 8, residualStdDev: 1 },
      createdAt: "2026-05-10T00:00:00.000Z",
      points: [
        { date: "2026-05-11", p10: 80, p50: 100, p90: 120 },
        { date: "2026-05-12", p10: 90, p50: 110, p90: 130 }
      ]
    };

    const actuals = new Map([
      ["2026-05-11", 95],
      ["2026-05-12", 105]
    ]);

    const result = scoreForwardAccuracyForRun(run, actuals);
    expect(result).not.toBeNull();
    expect(result?.scoredDays).toBe(2);
    expect(result?.mapePct).toBeGreaterThanOrEqual(0);
  });
});
