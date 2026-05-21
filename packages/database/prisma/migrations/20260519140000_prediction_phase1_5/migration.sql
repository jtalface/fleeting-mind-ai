-- CreateEnum
CREATE TYPE "PredictionScopeType" AS ENUM ('fleet', 'segment');

-- CreateTable
CREATE TABLE "PredictionRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scopeType" "PredictionScopeType" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "nameIncludes" TEXT,
    "metricKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "trainedUntil" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "backtestMapePct" DOUBLE PRECISION,
    "championSelected" BOOLEAN NOT NULL DEFAULT false,
    "explanationJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionPoint" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "p10" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PredictionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictionRun_tenantId_scopeType_scopeKey_metricKey_horizonDays_createdAt_idx" ON "PredictionRun"("tenantId", "scopeType", "scopeKey", "metricKey", "horizonDays", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionPoint_tenantId_date_idx" ON "PredictionPoint"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionPoint_runId_date_key" ON "PredictionPoint"("runId", "date");

-- AddForeignKey
ALTER TABLE "PredictionPoint" ADD CONSTRAINT "PredictionPoint_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PredictionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
