import type { ApiFleetLocationsResponse } from "@fleetmind/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, getFleetLocations } from "../api/client.js";

export type FleetLocationsData = ApiFleetLocationsResponse["data"];

export interface UseFleetLocationsResult {
  data: FleetLocationsData | undefined;
  loading: boolean;
  error: ApiClientError | undefined;
  refresh: () => Promise<void>;
}

export function useFleetLocations(cfg: ApiClientConfig): UseFleetLocationsResult {
  const [data, setData] = useState<FleetLocationsData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const locations = await getFleetLocations(cfg);
      setData(locations);
    } catch (e) {
      setData(undefined);
      setError(
        e instanceof ApiClientError
          ? e
          : new ApiClientError("Request failed", { code: "UNKNOWN", requestId: "", status: 0 })
      );
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
