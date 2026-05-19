import { describe, expect, it } from "vitest";
import { resolveSyncOptions } from "./sync-options.js";

describe("resolveSyncOptions", () => {
  it("defaults incremental sync to one page per device", () => {
    const options = resolveSyncOptions({ mode: "incremental" }, {});
    expect(options.maxPagesPerDevice).toBe(1);
  });

  it("caps backfill devices by default", () => {
    const options = resolveSyncOptions({ mode: "backfill" }, {});
    expect(options.maxDevices).toBe(10);
    expect(options.maxPagesPerDevice).toBe(3);
  });
});
