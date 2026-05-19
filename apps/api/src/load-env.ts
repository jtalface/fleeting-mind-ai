import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const result = dotenv.config({ path: path.join(monorepoRoot, ".env") });

if (result.error && process.env.NODE_ENV === "development") {
  console.warn(`[api] No .env loaded from ${monorepoRoot}: ${result.error.message}`);
}
