-- CreateTable
CREATE TABLE "TenantRateCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "revenuePerKm" DOUBLE PRECISION NOT NULL DEFAULT 2.1,
    "operatingCostPerKm" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetMetricDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tripCount" INTEGER NOT NULL DEFAULT 0,
    "idleRatioPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilizationPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "trainedUntil" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "maePct" DOUBLE PRECISION NOT NULL,
    "withinBandPct" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantRateCard_tenantId_key" ON "TenantRateCard"("tenantId");

-- CreateIndex
CREATE INDEX "FleetMetricDaily_tenantId_date_idx" ON "FleetMetricDaily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FleetMetricDaily_tenantId_vehicleId_date_key" ON "FleetMetricDaily"("tenantId", "vehicleId", "date");

-- CreateIndex
CREATE INDEX "ForecastEvaluation_tenantId_metricKey_createdAt_idx" ON "ForecastEvaluation"("tenantId", "metricKey", "createdAt");

-- AddForeignKey
ALTER TABLE "FleetMetricDaily" ADD CONSTRAINT "FleetMetricDaily_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
