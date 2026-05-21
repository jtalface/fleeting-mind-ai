import { afterEach, describe, expect, it } from "vitest";
import { resolveSegmentScopes, resolveTopVehicles } from "./prediction-config.js";

describe("prediction-config", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("parses segment scopes from env JSON", () => {
    process.env.FORECAST_SEGMENT_SCOPES = JSON.stringify([
      { scopeKey: "Truck", nameIncludes: "Truck" }
    ]);
    expect(resolveSegmentScopes()).toEqual([{ scopeKey: "Truck", nameIncludes: "Truck" }]);
  });

  it("prefers explicit segment scopes over env", () => {
    process.env.FORECAST_SEGMENT_SCOPES = JSON.stringify([{ scopeKey: "X", nameIncludes: "X" }]);
    expect(resolveSegmentScopes([{ scopeKey: "Y", nameIncludes: "Y" }])).toEqual([
      { scopeKey: "Y", nameIncludes: "Y" }
    ]);
  });

  it("defaults top vehicles to 5", () => {
    delete process.env.FORECAST_TOP_VEHICLES;
    delete process.env.WORKER_FORECAST_TOP_VEHICLES;
    expect(resolveTopVehicles()).toBe(5);
  });
});
