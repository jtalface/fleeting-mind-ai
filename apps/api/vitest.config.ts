import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const alias = (subpath: string): string => path.join(root, subpath);

// Workspace packages ship `dist/` in production but are never built during tests,
// so resolve every `@fleetmind/*` import (bare or subpath) straight to its TS source.
const workspacePackages = "shared|database|telemetry|analytics|ai-core|integrations|ui";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: new RegExp(`^@fleetmind/(${workspacePackages})/(.*)\\.js$`),
        replacement: alias("packages/$1/src/$2.ts")
      },
      {
        find: new RegExp(`^@fleetmind/(${workspacePackages})$`),
        replacement: alias("packages/$1/src/index.ts")
      }
    ]
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
