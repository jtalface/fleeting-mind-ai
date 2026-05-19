import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const alias = (subpath: string): string => path.join(root, subpath);

export default defineConfig({
  resolve: {
    alias: {
      "@fleetmind/database/client.js": alias("packages/database/src/client.ts"),
      "@fleetmind/database/repositories/in-memory.js": alias("packages/database/src/repositories/in-memory.ts"),
      "@fleetmind/database/repositories/prisma.js": alias("packages/database/src/repositories/prisma.ts"),
      "@fleetmind/database/repositories/contracts.js": alias("packages/database/src/repositories/contracts.ts"),
      "@fleetmind/shared/contracts/integrations.js": alias("packages/shared/src/contracts/integrations.ts"),
      "@fleetmind/shared/contracts/jobs.js": alias("packages/shared/src/contracts/jobs.ts"),
      "@fleetmind/shared/contracts/telemetry.js": alias("packages/shared/src/contracts/telemetry.ts"),
      "@fleetmind/shared/contracts/domain.js": alias("packages/shared/src/contracts/domain.ts"),
      "@fleetmind/shared/contracts/ai.js": alias("packages/shared/src/contracts/ai.ts"),
      "@fleetmind/shared/contracts/analytics.js": alias("packages/shared/src/contracts/analytics.ts"),
      "@fleetmind/telemetry/ingest-service.js": alias("packages/telemetry/src/ingest-service.ts"),
      "@fleetmind/telemetry/timeline-service.js": alias("packages/telemetry/src/timeline-service.ts"),
      "@fleetmind/integrations/": alias("packages/integrations/src/"),
      "@fleetmind/integrations": alias("packages/integrations/src/index.ts"),
      "@fleetmind/analytics/service.js": alias("packages/analytics/src/service.ts"),
      "@fleetmind/analytics/history.js": alias("packages/analytics/src/history.ts"),
      "@fleetmind/analytics/persist-insights.js": alias("packages/analytics/src/persist-insights.ts"),
      "@fleetmind/analytics/contracts.js": alias("packages/analytics/src/contracts.ts")
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
