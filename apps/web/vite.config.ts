import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  /** Load VITE_* from monorepo root `.env` (same file as API/worker). */
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react()],
  resolve: {
    alias: {
      "@fleetmind/ui": path.resolve(__dirname, "../../packages/ui/src"),
      /** Use package source in dev so new exports work without rebuilding dist. */
      "@fleetmind/shared": path.resolve(__dirname, "../../packages/shared/src")
    }
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      "/v1": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"]
  }
});
