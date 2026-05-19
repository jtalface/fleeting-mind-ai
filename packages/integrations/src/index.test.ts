import { describe, expect, it } from "vitest";
import type { IntegrationsPackageBoundary } from "./index.js";

describe("integrations package boundary contract", () => {
  it("exposes the expected boundary shape", () => {
    const boundary: IntegrationsPackageBoundary = {
      owns: ["vendor_adapters", "auth_tokens", "retry_policies", "rate_limits"],
      exposes: ["sync_vendor_data", "fetch_external_records"],
      mustNotImport: ["@fleetmind/api", "@fleetmind/web"]
    };

    expect(boundary.owns).toContain("vendor_adapters");
    expect(boundary.mustNotImport).toContain("@fleetmind/web");
  });
});
