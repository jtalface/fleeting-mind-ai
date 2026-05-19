import { getPrismaClient } from "@fleetmind/database/client.js";
import type { PrismaDbClient } from "@fleetmind/database/repositories/prisma.js";
import { ApiRuntime } from "./runtime.js";

export type ApiRuntimeOptions =
  | { storage: "memory" }
  | { storage: "prisma"; prisma: PrismaDbClient & { $disconnect(): Promise<void> } };

export async function createApiRuntime(): Promise<ApiRuntime> {
  const forceMemory = process.env.API_STORAGE === "memory";
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  if (forceMemory || !hasDatabase) {
    return new ApiRuntime({ storage: "memory" });
  }

  const prisma = await getPrismaClient();
  return new ApiRuntime({ storage: "prisma", prisma });
}
