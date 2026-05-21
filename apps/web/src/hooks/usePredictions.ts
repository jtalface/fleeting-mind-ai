import type { PredictionsListResult } from "@fleetmind/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, getPredictions } from "../api/client.js";

export interface UsePredictionsOptions {
  horizonDays?: number;
  scopeType?: "fleet" | "segment";
  scopeKey?: string;
}

export interface UsePredictionsResult {
  result: PredictionsListResult | undefined;
  loading: boolean;
  error: ApiClientError | undefined;
  refresh: () => Promise<void>;
}

export function usePredictions(cfg: ApiClientConfig, options: UsePredictionsOptions = {}): UsePredictionsResult {
  const [result, setResult] = useState<PredictionsListResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await getPredictions(cfg, {
        horizonDays: options.horizonDays ?? 7,
        ...(options.scopeType ? { scopeType: options.scopeType } : {}),
        ...(options.scopeKey ? { scopeKey: options.scopeKey } : {})
      });
      setResult(data);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e
          : new ApiClientError("Request failed", { code: "UNKNOWN", requestId: "", status: 0 })
      );
    } finally {
      setLoading(false);
    }
  }, [cfg, options.horizonDays, options.scopeType, options.scopeKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { result, loading, error, refresh };
}
