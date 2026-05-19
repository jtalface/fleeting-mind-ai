import { describe, expect, it } from "vitest";
import { resolveTenantJobWindow } from "./window-resolution.js";

describe("resolveTenantJobWindow", () => {
  it("expands last_24h_utc from job time", () => {
    const ts = Date.parse("2026-05-07T12:00:00.000Z");
    const result = resolveTenantJobWindow(
      { windowPreset: "last_24h_utc", asOf: "ignored-for-preset" },
      ts
    );
    expect(result.end).toBe("2026-05-07T12:00:00.000Z");
    expect(result.start).toBe("2026-05-06T12:00:00.000Z");
    expect(result.asOf).toBe(result.end);
  });

  it("honors explicit windows", () => {
    const result = resolveTenantJobWindow(
      {
        windowPreset: "explicit",
        windowStart: "2026-01-01T00:00:00.000Z",
        windowEnd: "2026-01-02T00:00:00.000Z",
        asOf: "2026-01-02T00:00:00.000Z"
      },
      Date.now()
    );
    expect(result.start).toContain("2026-01-01");
    expect(result.end).toContain("2026-01-02");
    expect(result.asOf).toContain("2026-01-02");
  });
});
