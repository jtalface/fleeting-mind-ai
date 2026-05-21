-- AlterTable
ALTER TABLE "TenantRateCard" ADD COLUMN IF NOT EXISTS "sourceContractId" TEXT;

-- CreateTable
CREATE TABLE "TenantBillingContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalJobId" TEXT,
    "revenuePerKm" DOUBLE PRECISION NOT NULL,
    "operatingCostPerKm" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBillingContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantBillingContract_tenantId_isActive_idx" ON "TenantBillingContract"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "TenantBillingContract_tenantId_createdAt_idx" ON "TenantBillingContract"("tenantId", "createdAt");
