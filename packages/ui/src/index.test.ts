import { describe, expect, it } from "vitest";
import type { UIPackageBoundary } from "./index.js";

describe("ui package boundary contract", () => {
  it("declares expected ownership and forbidden dependencies", () => {
    const boundary: UIPackageBoundary = {
      owns: ["design_tokens", "charts", "dashboard_widgets", "chat_components"],
      exposes: ["presentational_components"],
      mustNotImport: ["@fleetmind/database", "@fleetmind/analytics", "@fleetmind/ai-core"]
    };

    expect(boundary.exposes).toEqual(["presentational_components"]);
    expect(boundary.mustNotImport).toContain("@fleetmind/database");
  });
});
