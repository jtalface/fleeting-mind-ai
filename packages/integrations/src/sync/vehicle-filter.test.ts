import { describe, expect, it } from "vitest";
import type { ExternalVehicle } from "@fleetmind/shared/contracts/integrations.js";
import { applyDeviceCap, filterExternalVehicles } from "./vehicle-filter.js";

const sample: ExternalVehicle[] = [
  { id: "1", vin: "41028666", plateNumber: "Sweeper 7301", vehicleClass: "truck", active: true },
  { id: "2", vin: "41029001", plateNumber: "41029001", vehicleClass: "other", active: true },
  { id: "3", vin: "41024208", plateNumber: "Sweeper 6885", vehicleClass: "truck", active: true }
];

describe("filterExternalVehicles", () => {
  it("filters by deviceNameIncludes", () => {
    const filtered = filterExternalVehicles(sample, { deviceNameIncludes: "Sweeper" });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("filters by explicit device ids", () => {
    const filtered = filterExternalVehicles(sample, { deviceExternalIds: ["3", "1"] });
    expect(filtered.map((v) => v.id)).toEqual(["3", "1"]);
  });

  it("applies cap after filtering", () => {
    const filtered = filterExternalVehicles(sample, { deviceNameIncludes: "Sweeper" });
    const capped = applyDeviceCap(filtered, 1);
    expect(capped).toHaveLength(1);
  });
});
