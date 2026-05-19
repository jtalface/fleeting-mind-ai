import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@fleetmind/database/repositories/in-memory.js": path.join(
        root,
        "packages/database/src/repositories/in-memory.ts"
      ),
      "@fleetmind/database/repositories/contracts.js": path.join(
        root,
        "packages/database/src/repositories/contracts.ts"
      ),
      "@fleetmind/telemetry/ingest-service.js": path.join(root, "packages/telemetry/src/ingest-service.ts"),
      "@fleetmind/shared/contracts/integrations.js": path.join(
        root,
        "packages/shared/src/contracts/integrations.ts"
      ),
      "@fleetmind/shared/contracts/telemetry.js": path.join(root, "packages/shared/src/contracts/telemetry.ts"),
      "@fleetmind/shared/contracts/domain.js": path.join(root, "packages/shared/src/contracts/domain.ts")
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
