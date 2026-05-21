import { describe, expect, it } from "vitest";
import { allPredictionScopes, fleetScope, segmentScopes, vehicleScopes } from "./prediction-scopes.js";

describe("prediction-scopes", () => {
  it("builds fleet, segment, and vehicle scopes", () => {
    const scopes = allPredictionScopes({
      segmentScopes: [{ scopeKey: "Sweeper", nameIncludes: "Sweeper" }],
      topVehicles: [{ vehicleId: "veh_1", revenue: 100, label: "FLEET-001" }]
    });
    expect(scopes).toHaveLength(3);
    expect(scopes[0]).toEqual(fleetScope());
    expect(scopes[1]).toEqual(segmentScopes([{ scopeKey: "Sweeper", nameIncludes: "Sweeper" }])[0]);
    expect(scopes[2]).toEqual(
      vehicleScopes([{ vehicleId: "veh_1", revenue: 100, label: "FLEET-001" }])[0]
    );
  });

  it("allows fleet-only when no segments or vehicles", () => {
    expect(allPredictionScopes({ segmentScopes: [], topVehicles: [] })).toEqual([fleetScope()]);
  });
});
