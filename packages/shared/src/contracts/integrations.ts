import { z } from "zod";

/** Normalized vehicle record from an external fleet metrics API. */
export const externalVehicleSchema = z.object({
  id: z.string().min(1),
  vin: z.string().min(1).optional(),
  plateNumber: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  odometerKm: z.number().optional(),
  vehicleClass: z.enum(["truck", "van", "car", "heavy_equipment", "other"]).default("other"),
  active: z.boolean().default(true)
});

export type ExternalVehicle = z.infer<typeof externalVehicleSchema>;

/** Normalized telemetry snapshot from an external fleet metrics API. */
export const externalTelemetrySchema = z.object({
  vehicleId: z.string().min(1),
  timestamp: z.string().datetime(),
  latitude: z.number(),
  longitude: z.number(),
  speedKph: z.number().optional(),
  headingDegrees: z.number().optional(),
  engineRpm: z.number().optional(),
  ignitionOn: z.boolean().optional(),
  fuelLevelPct: z.number().min(0).max(100).optional(),
  odometerKm: z.number().optional(),
  engineHours: z.number().optional()
});

export type ExternalTelemetry = z.infer<typeof externalTelemetrySchema>;

export const externalTelemetryPageSchema = z.object({
  items: z.array(externalTelemetrySchema),
  nextCursor: z.string().optional()
});

export type ExternalTelemetryPage = z.infer<typeof externalTelemetryPageSchema>;

export interface IntegrationSyncResult {
  vehiclesUpserted: number;
  telemetryIngested: number;
  telemetryDeduplicated: number;
  tripsCreated: number;
  devicesProcessed: number;
  devicesSkipped: number;
  mode: "incremental" | "backfill";
  durationMs: number;
  nextCursor?: string;
}
