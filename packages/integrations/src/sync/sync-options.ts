import { z } from "zod";

export const syncModeSchema = z.enum(["incremental", "backfill"]);

export type SyncMode = z.infer<typeof syncModeSchema>;

export const vehicleMetricsSyncOptionsSchema = z.object({
  mode: syncModeSchema.default("incremental"),
  /** Cap devices processed per run (0 = no cap). Default 10 for backfill safety. */
  maxDevices: z.coerce.number().int().min(0).max(500).default(10),
  /** Days of history for backfill initial `from` timestamp. */
  lookbackDays: z.coerce.number().int().min(1).max(90).default(7),
  /** Max flespi message pages per device (each page up to FLESPI_MESSAGES_PAGE_SIZE). */
  maxPagesPerDevice: z.coerce.number().int().min(1).max(50).default(3),
  /** Pause between devices to respect API rate limits. */
  delayMsBetweenDevices: z.coerce.number().int().min(0).max(10_000).default(150),
  /** Explicit flespi device ids — when set, selection starts from this list. */
  deviceExternalIds: z.array(z.string().min(1)).optional(),
  /** Case-insensitive substring on name/VIN/id (e.g. "Sweeper"). */
  deviceNameIncludes: z.string().min(1).optional()
});

export type VehicleMetricsSyncOptions = z.infer<typeof vehicleMetricsSyncOptionsSchema>;

const hasExplicitSelection = (options: Partial<VehicleMetricsSyncOptions>): boolean =>
  (options.deviceExternalIds?.length ?? 0) > 0 || Boolean(options.deviceNameIncludes?.trim());

export function resolveSyncOptions(
  overrides: Partial<VehicleMetricsSyncOptions> = {},
  env: NodeJS.ProcessEnv = process.env
): VehicleMetricsSyncOptions {
  const defaults = vehicleMetricsSyncOptionsSchema.parse({
    mode: env.FLESPI_SYNC_MODE ?? "incremental",
    maxDevices: env.FLESPI_SYNC_MAX_DEVICES ?? "10",
    lookbackDays: env.FLESPI_BACKFILL_LOOKBACK_DAYS ?? "7",
    maxPagesPerDevice: env.FLESPI_SYNC_MAX_PAGES_PER_DEVICE ?? "3",
    delayMsBetweenDevices: env.FLESPI_SYNC_DELAY_MS ?? "150"
  });
  const merged = vehicleMetricsSyncOptionsSchema.parse({ ...defaults, ...overrides });
  if (merged.mode === "incremental" && overrides.maxPagesPerDevice === undefined) {
    merged.maxPagesPerDevice = 1;
  }
  if (
    merged.mode === "backfill" &&
    overrides.maxDevices === undefined &&
    defaults.maxDevices === 10 &&
    !hasExplicitSelection(overrides)
  ) {
    merged.maxDevices = 10;
  }
  if (hasExplicitSelection(merged)) {
    // Explicit id/name selection — do not silently truncate unless maxDevices provided.
    if (overrides.maxDevices === undefined) {
      merged.maxDevices = 0;
    }
  }
  return merged;
}

export function backfillFromUnix(lookbackDays: number, nowMs = Date.now()): number {
  return Math.floor((nowMs - lookbackDays * 24 * 60 * 60 * 1000) / 1000);
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
