-- Create enums
CREATE TYPE "VehicleClass" AS ENUM ('truck', 'van', 'car', 'heavy_equipment', 'other');
CREATE TYPE "TelemetrySource" AS ENUM ('device', 'partner_api', 'manual');
CREATE TYPE "FuelSource" AS ENUM ('telematics', 'fuel_card', 'manual');
CREATE TYPE "MaintenanceType" AS ENUM ('preventive', 'repair', 'inspection');
CREATE TYPE "MaintenanceStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'canceled');
CREATE TYPE "InsightEntityType" AS ENUM ('fleet', 'vehicle', 'route', 'driver');
CREATE TYPE "InsightSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "MetricUnit" AS ENUM ('currency', 'percent', 'ratio', 'distance', 'duration', 'count');
CREATE TYPE "ConversationRole" AS ENUM ('user', 'assistant', 'system');

-- Create tables
CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vin" TEXT NOT NULL,
  "plateNumber" TEXT,
  "class" "VehicleClass" NOT NULL,
  "make" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "odometerKm" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelemetryPoint" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "speedKph" DOUBLE PRECISION,
  "headingDegrees" DOUBLE PRECISION,
  "engineRpm" INTEGER,
  "ignitionOn" BOOLEAN,
  "fuelLevelPct" DOUBLE PRECISION,
  "odometerKm" DOUBLE PRECISION,
  "engineHours" DOUBLE PRECISION,
  "source" "TelemetrySource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelemetryPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trip" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "driverId" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "startOdometerKm" DOUBLE PRECISION NOT NULL,
  "endOdometerKm" DOUBLE PRECISION NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "idleMinutes" DOUBLE PRECISION NOT NULL,
  "averageSpeedKph" DOUBLE PRECISION NOT NULL,
  "geofenceStartId" TEXT,
  "geofenceEndId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FuelReading" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "volumeLiters" DOUBLE PRECISION NOT NULL,
  "totalCost" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "stationName" TEXT,
  "source" "FuelSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FuelReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" "MaintenanceType" NOT NULL,
  "status" "MaintenanceStatus" NOT NULL,
  "occurredAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "odometerKm" DOUBLE PRECISION,
  "engineHours" DOUBLE PRECISION,
  "laborCost" DOUBLE PRECISION,
  "partsCost" DOUBLE PRECISION,
  "totalCost" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Insight" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" "InsightEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "severity" "InsightSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsightMetric" (
  "id" TEXT NOT NULL,
  "insightId" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" "MetricUnit" NOT NULL,
  "timeframe" TEXT NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsightMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subject" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "role" "ConversationRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX "Vehicle_tenantId_vin_key" ON "Vehicle"("tenantId", "vin");
CREATE INDEX "Vehicle_tenantId_createdAt_idx" ON "Vehicle"("tenantId", "createdAt");
CREATE UNIQUE INDEX "TelemetryPoint_tenantId_vehicleId_timestamp_key" ON "TelemetryPoint"("tenantId", "vehicleId", "timestamp");
CREATE INDEX "TelemetryPoint_tenantId_timestamp_idx" ON "TelemetryPoint"("tenantId", "timestamp");
CREATE INDEX "Trip_tenantId_startTime_idx" ON "Trip"("tenantId", "startTime");
CREATE INDEX "Trip_tenantId_vehicleId_startTime_idx" ON "Trip"("tenantId", "vehicleId", "startTime");
CREATE INDEX "FuelReading_tenantId_timestamp_idx" ON "FuelReading"("tenantId", "timestamp");
CREATE INDEX "MaintenanceRecord_tenantId_status_dueAt_idx" ON "MaintenanceRecord"("tenantId", "status", "dueAt");
CREATE INDEX "Insight_tenantId_createdAt_idx" ON "Insight"("tenantId", "createdAt");
CREATE INDEX "Conversation_tenantId_updatedAt_idx" ON "Conversation"("tenantId", "updatedAt");
CREATE INDEX "ConversationMessage_tenantId_conversationId_createdAt_idx" ON "ConversationMessage"("tenantId", "conversationId", "createdAt");

-- Foreign keys
ALTER TABLE "TelemetryPoint"
ADD CONSTRAINT "TelemetryPoint_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Trip"
ADD CONSTRAINT "Trip_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FuelReading"
ADD CONSTRAINT "FuelReading_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceRecord"
ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InsightMetric"
ADD CONSTRAINT "InsightMetric_insightId_fkey"
FOREIGN KEY ("insightId") REFERENCES "Insight"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
ADD CONSTRAINT "ConversationMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
