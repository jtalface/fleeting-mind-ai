import type {
  ApiAnalyticsQueryRequest,
  ApiAnalyticsQueryResponse,
  ApiChatRequest,
  ApiChatResponse,
  ApiErrorEnvelope,
  ApiFleetLocationsResponse
} from "@fleetmind/shared";

export interface ApiClientConfig {
  baseUrl: string;
  tenantId: string;
  userId: string;
  fetchImpl?: typeof fetch;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, init: { code: string; requestId: string; status: number; details?: unknown }) {
    super(message);
    this.name = "ApiClientError";
    this.code = init.code;
    this.requestId = init.requestId;
    this.status = init.status;
    this.details = init.details;
  }
}

function buildHeaders(cfg: ApiClientConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-tenant-id": cfg.tenantId,
    "x-user-id": cfg.userId
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function postAnalyticsQuery(
  cfg: ApiClientConfig,
  body: ApiAnalyticsQueryRequest
): Promise<ApiAnalyticsQueryResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/analytics/query`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body)
  });

  const payload = await parseJson<ApiAnalyticsQueryResponse | ApiErrorEnvelope>(res);

  if (!res.ok || "error" in payload) {
    const err = "error" in payload ? payload.error : { code: "UNKNOWN", message: res.statusText, requestId: "" };
    throw new ApiClientError(err.message, {
      code: err.code,
      requestId: err.requestId,
      status: res.status,
      details: "details" in err ? err.details : undefined
    });
  }

  return payload.data;
}

export async function getFleetLocations(
  cfg: ApiClientConfig
): Promise<ApiFleetLocationsResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/fleet/locations`;
  const res = await fetchFn(url, {
    method: "GET",
    headers: buildHeaders(cfg)
  });

  const payload = await parseJson<ApiFleetLocationsResponse | ApiErrorEnvelope>(res);

  if (!res.ok || "error" in payload) {
    const err = "error" in payload ? payload.error : { code: "UNKNOWN", message: res.statusText, requestId: "" };
    throw new ApiClientError(err.message, {
      code: err.code,
      requestId: err.requestId,
      status: res.status,
      details: "details" in err ? err.details : undefined
    });
  }

  return payload.data;
}

export async function postChatTurn(cfg: ApiClientConfig, body: ApiChatRequest): Promise<ApiChatResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/chat`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body)
  });

  const payload = await parseJson<ApiChatResponse | ApiErrorEnvelope>(res);

  if (!res.ok || "error" in payload) {
    const err = "error" in payload ? payload.error : { code: "UNKNOWN", message: res.statusText, requestId: "" };
    throw new ApiClientError(err.message, {
      code: err.code,
      requestId: err.requestId,
      status: res.status,
      details: "details" in err ? err.details : undefined
    });
  }

  return payload.data;
}
