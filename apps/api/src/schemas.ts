import { z } from "zod";

export const telemetryIngestBodySchema = z.object({
  point: z.object({
    vehicleId: z.string().min(1),
    timestamp: z.string().datetime(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speedKph: z.number().min(0).optional(),
    headingDegrees: z.number().min(0).max(360).optional(),
    engineRpm: z.number().min(0).optional(),
    ignitionOn: z.boolean().optional(),
    fuelLevelPct: z.number().min(0).max(100).optional(),
    odometerKm: z.number().min(0).optional(),
    engineHours: z.number().min(0).optional(),
    source: z.enum(["device", "partner_api", "manual"])
  })
});

export const analyticsQueryBodySchema = z.object({
  window: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  horizonDays: z.number().int().min(1).max(90).optional()
});

export const chatBodySchema = z.object({
  conversationId: z.string().min(1),
  question: z.string().min(1)
});

export const integrationBackfillBodySchema = z
  .object({
    maxDevices: z.number().int().min(0).max(100).optional(),
    lookbackDays: z.number().int().min(1).max(90).default(7),
    maxPagesPerDevice: z.number().int().min(1).max(20).default(3),
    deviceExternalIds: z.array(z.string().min(1)).optional(),
    deviceNameIncludes: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    const hasSelection =
      (value.deviceExternalIds?.length ?? 0) > 0 || Boolean(value.deviceNameIncludes?.trim());
    if (!hasSelection && (value.maxDevices === undefined || value.maxDevices < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide maxDevices (>=1) or deviceExternalIds or deviceNameIncludes",
        path: ["maxDevices"]
      });
    }
  });

export const integrationSyncBodySchema = z.object({
  deviceExternalIds: z.array(z.string().min(1)).optional(),
  deviceNameIncludes: z.string().min(1).optional(),
  maxDevices: z.number().int().min(0).max(500).optional()
});
