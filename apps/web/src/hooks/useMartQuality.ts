import type { MartQualityReport } from "@fleetmind/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { getMartQuality } from "../api/client.js";

export function useMartQuality(cfg: ApiClientConfig, lookbackDays?: number): {
  report: MartQualityReport | undefined;
  loading: boolean;
  error: string | undefined;
  refresh: () => Promise<void>;
} {
  const [report, setReport] = useState<MartQualityReport | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await getMartQuality(cfg, lookbackDays !== undefined ? { lookbackDays } : {});
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mart quality");
      setReport(undefined);
    } finally {
      setLoading(false);
    }
  }, [cfg, lookbackDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}
