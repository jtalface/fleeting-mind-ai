import type { PredictionScopeType } from "@fleetmind/shared/contracts/predictions.js";

export interface SegmentPredictionScope {
  scopeKey: string;
  nameIncludes: string;
}

export interface PredictionScopeDefinition {
  scopeType: PredictionScopeType;
  scopeKey: string;
  nameIncludes?: string;
}

/** Default segment scopes scored on each forecast refresh (Phase 1.5). */
export const DEFAULT_SEGMENT_SCOPES: SegmentPredictionScope[] = [
  { scopeKey: "Sweeper", nameIncludes: "Sweeper" }
];

export function fleetScope(): PredictionScopeDefinition {
  return { scopeType: "fleet", scopeKey: "fleet" };
}

export function segmentScopes(
  segments: SegmentPredictionScope[] = DEFAULT_SEGMENT_SCOPES
): PredictionScopeDefinition[] {
  return segments.map((segment) => ({
    scopeType: "segment" as const,
    scopeKey: segment.scopeKey,
    nameIncludes: segment.nameIncludes
  }));
}

export function allPredictionScopes(
  segments: SegmentPredictionScope[] = DEFAULT_SEGMENT_SCOPES
): PredictionScopeDefinition[] {
  return [fleetScope(), ...segmentScopes(segments)];
}
