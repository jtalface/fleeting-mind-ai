import type { ForecastEvaluationListResult } from "@fleetmind/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, getPredictionsEvaluations } from "../api/client.js";

export function usePredictionsEvaluations(
  cfg: ApiClientConfig,
  options: { limit?: number; scopeType?: "fleet" | "segment"; scopeKey?: string } = {}
): {
  result: ForecastEvaluationListResult | undefined;
  loading: boolean;
  error: ApiClientError | undefined;
  refresh: () => Promise<void>;
} {
  const [result, setResult] = useState<ForecastEvaluationListResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await getPredictionsEvaluations(cfg, {
        limit: options.limit ?? 20,
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
  }, [cfg, options.limit, options.scopeType, options.scopeKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { result, loading, error, refresh };
}
