/** Flespi uses second-precision unix times; normalize so lookup matches storage. */
export const normalizeTelemetryTimestamp = (iso: string): Date => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid telemetry timestamp: ${iso}`);
  }
  return new Date(Math.floor(ms / 1000) * 1000);
};

export const telemetryTimestampKey = (vehicleId: string, iso: string): string => {
  const ms = Date.parse(iso);
  return `${vehicleId}|${Math.floor(ms / 1000)}`;
};
