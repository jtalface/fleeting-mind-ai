import type { BatchAnalyticsJobPayload, ForecastRefreshJobPayload } from "@fleetmind/shared/contracts/jobs.js";

export interface ResolvedWindow {
  start: string;
  end: string;
  asOf: string;
}

interface WindowFields {
  windowPreset: "explicit" | "last_24h_utc" | "last_7d_utc" | "last_30d_utc";
  windowStart?: string;
  windowEnd?: string;
  asOf: string;
}

const rollingUtcWindow = (jobTimestampMs: number, lookbackMs: number): ResolvedWindow => {
  const end = new Date(jobTimestampMs);
  const start = new Date(jobTimestampMs - lookbackMs);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    asOf: end.toISOString()
  };
};

export function resolveTenantJobWindow(payload: WindowFields, jobTimestampMs: number): ResolvedWindow {
  if (payload.windowPreset === "last_24h_utc") {
    return rollingUtcWindow(jobTimestampMs, 24 * 60 * 60 * 1000);
  }
  if (payload.windowPreset === "last_7d_utc") {
    return rollingUtcWindow(jobTimestampMs, 7 * 24 * 60 * 60 * 1000);
  }
  if (payload.windowPreset === "last_30d_utc") {
    return rollingUtcWindow(jobTimestampMs, 30 * 24 * 60 * 60 * 1000);
  }

  return {
    start: payload.windowStart ?? "",
    end: payload.windowEnd ?? "",
    asOf: payload.asOf
  };
}

export function resolveForecastWindow(payload: ForecastRefreshJobPayload, jobTimestampMs: number): ResolvedWindow {
  const fields: WindowFields = {
    windowPreset: payload.windowPreset,
    asOf: payload.asOf
  };
  if (payload.windowStart !== undefined) {
    fields.windowStart = payload.windowStart;
  }
  if (payload.windowEnd !== undefined) {
    fields.windowEnd = payload.windowEnd;
  }
  return resolveTenantJobWindow(fields, jobTimestampMs);
}

export function batchPayloadWindowFields(payload: BatchAnalyticsJobPayload): WindowFields {
  const fields: WindowFields = {
    windowPreset: payload.windowPreset,
    asOf: payload.asOf
  };
  if (payload.windowStart !== undefined) {
    fields.windowStart = payload.windowStart;
  }
  if (payload.windowEnd !== undefined) {
    fields.windowEnd = payload.windowEnd;
  }
  return fields;
}
