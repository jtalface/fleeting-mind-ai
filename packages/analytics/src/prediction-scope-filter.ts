import type { HistorySegmentFilter } from "./contracts.js";
import type { PredictionScopeDefinition } from "./prediction-scopes.js";
import type { PredictionBundle } from "@fleetmind/shared/contracts/predictions.js";

export function historyFilterForScope(scope: PredictionScopeDefinition): HistorySegmentFilter | undefined {
  if (scope.scopeType === "vehicle" && scope.vehicleId) {
    return { vehicleId: scope.vehicleId };
  }
  if (scope.scopeType === "segment" && scope.nameIncludes) {
    return { nameIncludes: scope.nameIncludes };
  }
  return undefined;
}

export function historyFilterForBundle(bundle: PredictionBundle): HistorySegmentFilter | undefined {
  if (bundle.scopeType === "vehicle") {
    return { vehicleId: bundle.scopeKey };
  }
  if (bundle.scopeType === "segment" && bundle.nameIncludes) {
    return { nameIncludes: bundle.nameIncludes };
  }
  return undefined;
}

export function scopeHistoryCacheKey(scope: PredictionScopeDefinition | PredictionBundle): string {
  if (scope.scopeType === "vehicle") {
    const vehicleId = "vehicleId" in scope && scope.vehicleId ? scope.vehicleId : scope.scopeKey;
    return `vehicle:${vehicleId}`;
  }
  const nameIncludes = "nameIncludes" in scope ? scope.nameIncludes : undefined;
  return `${scope.scopeType}:${scope.scopeKey}:${nameIncludes ?? ""}`;
}

export function historyFilterForRun(run: {
  scopeType: PredictionBundle["scopeType"];
  scopeKey: string;
  nameIncludes?: string;
}): HistorySegmentFilter | undefined {
  if (run.scopeType === "vehicle") {
    return { vehicleId: run.scopeKey };
  }
  if (run.scopeType === "segment" && run.nameIncludes) {
    return { nameIncludes: run.nameIncludes };
  }
  return undefined;
}

export function scopeHistoryCacheKeyForRun(run: {
  scopeType: PredictionBundle["scopeType"];
  scopeKey: string;
  nameIncludes?: string;
}): string {
  if (run.scopeType === "vehicle") {
    return `vehicle:${run.scopeKey}`;
  }
  return `${run.scopeType}:${run.scopeKey}:${run.nameIncludes ?? ""}`;
}
