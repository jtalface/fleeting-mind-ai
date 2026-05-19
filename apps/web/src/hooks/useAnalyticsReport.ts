import type { AnalyticsReport } from "@fleetmind/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, postAnalyticsQuery } from "../api/client.js";

export interface UseAnalyticsReportResult {
  report: AnalyticsReport | undefined;
  loading: boolean;
  error: ApiClientError | undefined;
  refresh: () => Promise<void>;
}

export function useAnalyticsReport(
  cfg: ApiClientConfig,
  windowStartIso: string,
  windowEndIso: string,
  horizonDays: number
): UseAnalyticsReportResult {
  const [report, setReport] = useState<AnalyticsReport | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await postAnalyticsQuery(cfg, {
        window: { start: windowStartIso, end: windowEndIso },
        horizonDays
      });
      setReport(data);
    } catch (e) {
      setReport(undefined);
      setError(e instanceof ApiClientError ? e : new ApiClientError("Request failed", { code: "UNKNOWN", requestId: "", status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [cfg, horizonDays, windowEndIso, windowStartIso]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}
