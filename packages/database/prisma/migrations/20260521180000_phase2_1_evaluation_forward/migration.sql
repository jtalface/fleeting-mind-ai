-- AlterTable
ALTER TABLE "ForecastEvaluation" ADD COLUMN IF NOT EXISTS "evaluationKind" TEXT NOT NULL DEFAULT 'holdout',
ADD COLUMN IF NOT EXISTS "runId" TEXT;

-- Keep newest row per dedupe key (removes append-only duplicates from Phase 2 refreshes)
DELETE FROM "ForecastEvaluation" fe
WHERE fe.id NOT IN (
  SELECT DISTINCT ON (
    "tenantId",
    "scopeType",
    "scopeKey",
    "metricKey",
    "horizonDays",
    "evaluationKind",
    "trainedUntil"
  ) id
  FROM "ForecastEvaluation"
  ORDER BY
    "tenantId",
    "scopeType",
    "scopeKey",
    "metricKey",
    "horizonDays",
    "evaluationKind",
    "trainedUntil",
    "createdAt" DESC
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForecastEvaluation_tenantId_evaluationKind_createdAt_idx" ON "ForecastEvaluation"("tenantId", "evaluationKind", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForecastEvaluation_runId_idx" ON "ForecastEvaluation"("runId");

-- Dedupe key for upserts (one row per scoring event)
DROP INDEX IF EXISTS "ForecastEvaluation_dedupe_key";
CREATE UNIQUE INDEX "ForecastEvaluation_dedupe_key" ON "ForecastEvaluation"(
  "tenantId",
  "scopeType",
  "scopeKey",
  "metricKey",
  "horizonDays",
  "evaluationKind",
  "trainedUntil"
);
