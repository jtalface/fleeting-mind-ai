import type { PrismaDbClient } from "./repositories/prisma.js";

type PrismaClientConstructor = new () => PrismaDbClient & { $disconnect(): Promise<void> };

let prismaSingleton: (PrismaDbClient & { $disconnect(): Promise<void> }) | null = null;

/**
 * Returns a shared Prisma client typed against repository delegates.
 * Generates client on first use — run `pnpm --filter @fleetmind/database prisma:generate` after schema changes.
 */
export async function getPrismaClient(): Promise<PrismaDbClient & { $disconnect(): Promise<void> }> {
  if (prismaSingleton) {
    return prismaSingleton;
  }
  const pkg = await import("@prisma/client");
  const PrismaClient = (pkg as unknown as { PrismaClient: PrismaClientConstructor }).PrismaClient;
  prismaSingleton = new PrismaClient() as PrismaDbClient & { $disconnect(): Promise<void> };
  return prismaSingleton;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
}
