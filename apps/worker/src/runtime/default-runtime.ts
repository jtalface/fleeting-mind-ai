import { DefaultAnalyticsService } from "@fleetmind/analytics/service.js";
import type { PrismaDbClient } from "@fleetmind/database/repositories/prisma.js";
import { createPrismaTenantRepositories } from "@fleetmind/database/repositories/prisma.js";
import type { WorkerRuntime } from "./types.js";

type WorkerPrismaClient = PrismaDbClient & { $disconnect(): Promise<void> };

export function createDefaultWorkerRuntime(prisma: WorkerPrismaClient): WorkerRuntime {
  const analytics = new DefaultAnalyticsService();
  return {
    analytics,
    getRepositoriesForTenant: (tenantId: string) => createPrismaTenantRepositories(tenantId, prisma),
    disconnect: async () => {
      await prisma.$disconnect();
    }
  };
}
