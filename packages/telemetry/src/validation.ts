import { z } from "zod";

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

export const telemetryPointSchema = z.object({
  vehicleId: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  speedKph: z.number().min(0).max(400).optional(),
  headingDegrees: z.number().min(0).max(360).optional(),
  engineRpm: z.number().min(0).max(12000).optional(),
  ignitionOn: z.boolean().optional(),
  fuelLevelPct: z.number().min(0).max(100).optional(),
  odometerKm: z.number().min(0).optional(),
  engineHours: z.number().min(0).optional(),
  source: z.enum(["device", "partner_api", "manual"])
});
