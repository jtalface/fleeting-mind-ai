import type { BatchAnalyticsJobPayload, ForecastRefreshJobPayload } from "@fleetmind/shared/contracts/jobs.js";

export interface ResolvedWindow {
  start: string;
  end: string;
  asOf: string;
}

interface WindowFields {
  windowPreset: "explicit" | "last_24h_utc";
  windowStart?: string;
  windowEnd?: string;
  asOf: string;
}

export function resolveTenantJobWindow(payload: WindowFields, jobTimestampMs: number): ResolvedWindow {
  if (payload.windowPreset === "last_24h_utc") {
    const end = new Date(jobTimestampMs);
    const start = new Date(jobTimestampMs - 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      asOf: end.toISOString()
    };
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
