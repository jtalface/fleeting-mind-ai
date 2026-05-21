-- AlterTable
ALTER TABLE "ForecastEvaluation" ADD COLUMN "scopeType" "PredictionScopeType" NOT NULL DEFAULT 'fleet',
ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT 'fleet';

-- CreateIndex
CREATE INDEX "ForecastEvaluation_tenantId_scopeType_scopeKey_createdAt_idx" ON "ForecastEvaluation"("tenantId", "scopeType", "scopeKey", "createdAt");
