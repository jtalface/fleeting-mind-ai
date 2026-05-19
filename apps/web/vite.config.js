import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@fleetmind/ui": path.resolve(__dirname, "../../packages/ui/src")
        }
    },
    server: {
        port: 5173,
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
//# sourceMappingURL=vite.config.js.map