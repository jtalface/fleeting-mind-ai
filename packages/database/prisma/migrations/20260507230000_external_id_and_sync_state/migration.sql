-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_externalId_key" ON "Vehicle"("tenantId", "externalId");

-- CreateTable
CREATE TABLE "IntegrationSyncState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncState_tenantId_connector_key" ON "IntegrationSyncState"("tenantId", "connector");

-- CreateIndex
CREATE INDEX "IntegrationSyncState_tenantId_updatedAt_idx" ON "IntegrationSyncState"("tenantId", "updatedAt");
