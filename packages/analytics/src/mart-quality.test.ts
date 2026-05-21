import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "../../database/src/repositories/in-memory.js";
import { assessMartQuality } from "./mart-quality.js";

describe("assessMartQuality", () => {
  it("flags low coverage when no trips exist", async () => {
    const repos = createInMemoryTenantRepositories("tenant_qa");
    await repos.vehicles.create({ vin: "VIN1", class: "truck", active: true });

    const window = {
      start: "2026-05-01T00:00:00.000Z",
      end: "2026-05-14T00:00:00.000Z"
    };

    const report = await assessMartQuality({
      tenantId: "tenant_qa",
      repositories: repos,
      window,
      asOf: window.end
    });

    expect(report.ok).toBe(false);
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.daysWithTripActivity).toBe(0);
  });
});
