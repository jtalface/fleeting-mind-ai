import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const alias: Record<string, string> = {
  "@fleetmind/shared/contracts/jobs.js": path.join(root, "packages/shared/src/contracts/jobs.ts"),
  "@fleetmind/analytics/contracts.js": path.join(root, "packages/analytics/src/contracts.ts"),
  "@fleetmind/analytics/service.js": path.join(root, "packages/analytics/src/service.ts"),
  "@fleetmind/analytics/history.js": path.join(root, "packages/analytics/src/history.ts"),
  "@fleetmind/analytics/persist-insights.js": path.join(root, "packages/analytics/src/persist-insights.ts"),
  "@fleetmind/analytics/daily-mart.js": path.join(root, "packages/analytics/src/daily-mart.ts"),
  "@fleetmind/analytics/persist-forecast-evaluations.js": path.join(root, "packages/analytics/src/persist-forecast-evaluations.ts"),
  "@fleetmind/integrations": path.join(root, "packages/integrations/src/index.ts"),
  "@fleetmind/integrations/": path.join(root, "packages/integrations/src/"),
  "@fleetmind/database/repositories/contracts.js": path.join(root, "packages/database/src/repositories/contracts.ts"),
  "@fleetmind/database/repositories/prisma.js": path.join(root, "packages/database/src/repositories/prisma.ts"),
  "@fleetmind/database/repositories/in-memory.js": path.join(root, "packages/database/src/repositories/in-memory.ts")
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
