import type { SegmentPredictionScope } from "./prediction-scopes.js";

export const DEFAULT_TOP_VEHICLES = 5;

const parseSegmentScopesJson = (raw: string | undefined): SegmentPredictionScope[] | undefined => {
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    const scopes: SegmentPredictionScope[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { scopeKey?: unknown }).scopeKey === "string" &&
        typeof (item as { nameIncludes?: unknown }).nameIncludes === "string"
      ) {
        scopes.push({
          scopeKey: (item as { scopeKey: string }).scopeKey,
          nameIncludes: (item as { nameIncludes: string }).nameIncludes
        });
      }
    }
    return scopes;
  } catch {
    return undefined;
  }
};

/** Segment scopes from explicit options, then FORECAST_* / WORKER_FORECAST_* env JSON; default none. */
export function resolveSegmentScopes(explicit?: SegmentPredictionScope[]): SegmentPredictionScope[] {
  if (explicit !== undefined) {
    return explicit;
  }
  const fromEnv =
    parseSegmentScopesJson(process.env.FORECAST_SEGMENT_SCOPES) ??
    parseSegmentScopesJson(process.env.WORKER_FORECAST_SEGMENT_SCOPES);
  return fromEnv ?? [];
}

/** Top vehicles to forecast by window revenue (0 disables vehicle scopes). */
export function resolveTopVehicles(explicit?: number): number {
  if (explicit !== undefined) {
    return clampTopVehicles(explicit);
  }
  const raw = process.env.FORECAST_TOP_VEHICLES ?? process.env.WORKER_FORECAST_TOP_VEHICLES ?? String(DEFAULT_TOP_VEHICLES);
  const n = Number(raw);
  return clampTopVehicles(Number.isFinite(n) ? n : DEFAULT_TOP_VEHICLES);
}

const clampTopVehicles = (n: number): number => Math.min(50, Math.max(0, Math.floor(n)));
