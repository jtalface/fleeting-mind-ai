import type {
  ApiAnalyticsQueryRequest,
  ApiAnalyticsQueryResponse,
  ApiChatRequest,
  ApiChatResponse,
  ApiErrorEnvelope,
  ApiFleetLocationsResponse,
  ApiPredictionsEvaluationTrendsResponse,
  ApiPredictionsEvaluationsResponse,
  ApiPredictionsForwardAccuracyResponse,
  ApiPredictionsListResponse,
  EvaluationTrendsResult,
  ForwardAccuracyListResult,
  ApiPredictionsRefreshRequest,
  ApiPredictionsRefreshResponse,
  ForecastEvaluationListResult,
  ApiBillingContractActivateResponse,
  ApiBillingContractCreateRequest,
  ApiBillingContractCreateResponse,
  ApiBillingContractsListResponse,
  ApiTenantRateCardResponse,
  ApiTenantRateCardUpsertRequest,
  BillingContractListResult,
  PredictionsListResult,
  TenantBillingContract
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

export interface GetPredictionsQuery {
  horizonDays?: number;
  lookbackDays?: number;
  scopeType?: "fleet" | "segment" | "vehicle";
  scopeKey?: string;
  metricKey?: string;
}

export async function postPredictionsRefresh(
  cfg: ApiClientConfig,
  body: ApiPredictionsRefreshRequest = {}
): Promise<PredictionsListResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/predictions/refresh`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body)
  });

  const payload = await parseJson<ApiPredictionsRefreshResponse | ApiErrorEnvelope>(res);

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

export async function getPredictions(
  cfg: ApiClientConfig,
  query: GetPredictionsQuery = {}
): Promise<PredictionsListResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (query.horizonDays !== undefined) {
    params.set("horizonDays", String(query.horizonDays));
  }
  if (query.lookbackDays !== undefined) {
    params.set("lookbackDays", String(query.lookbackDays));
  }
  if (query.scopeType) {
    params.set("scopeType", query.scopeType);
  }
  if (query.scopeKey) {
    params.set("scopeKey", query.scopeKey);
  }
  if (query.metricKey) {
    params.set("metricKey", query.metricKey);
  }
  const qs = params.toString();
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/predictions${qs ? `?${qs}` : ""}`;
  const res = await fetchFn(url, {
    method: "GET",
    headers: buildHeaders(cfg)
  });

  const payload = await parseJson<ApiPredictionsListResponse | ApiErrorEnvelope>(res);

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

export async function getPredictionsForwardAccuracy(
  cfg: ApiClientConfig,
  query: { limit?: number } = {}
): Promise<ForwardAccuracyListResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  const qs = params.toString();
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/predictions/forward-accuracy${qs ? `?${qs}` : ""}`;
  const res = await fetchFn(url, { method: "GET", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiPredictionsForwardAccuracyResponse | ApiErrorEnvelope>(res);
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

export async function getPredictionsEvaluationTrends(
  cfg: ApiClientConfig,
  query: { limit?: number; evaluationKind?: "holdout" | "forward" } = {}
): Promise<EvaluationTrendsResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query.evaluationKind) {
    params.set("evaluationKind", query.evaluationKind);
  }
  const qs = params.toString();
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/predictions/evaluation-trends${qs ? `?${qs}` : ""}`;
  const res = await fetchFn(url, { method: "GET", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiPredictionsEvaluationTrendsResponse | ApiErrorEnvelope>(res);
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

export async function getPredictionsEvaluations(
  cfg: ApiClientConfig,
  query: { limit?: number; metricKey?: string; scopeType?: "fleet" | "segment" | "vehicle"; scopeKey?: string } = {}
): Promise<ForecastEvaluationListResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query.metricKey) {
    params.set("metricKey", query.metricKey);
  }
  if (query.scopeType) {
    params.set("scopeType", query.scopeType);
  }
  if (query.scopeKey) {
    params.set("scopeKey", query.scopeKey);
  }
  const qs = params.toString();
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/predictions/evaluations${qs ? `?${qs}` : ""}`;
  const res = await fetchFn(url, { method: "GET", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiPredictionsEvaluationsResponse | ApiErrorEnvelope>(res);
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

export async function getTenantRateCard(cfg: ApiClientConfig): Promise<ApiTenantRateCardResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/tenant/rate-card`;
  const res = await fetchFn(url, { method: "GET", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiTenantRateCardResponse | ApiErrorEnvelope>(res);
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

export async function getBillingContracts(cfg: ApiClientConfig): Promise<BillingContractListResult> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/tenant/billing-contracts`;
  const res = await fetchFn(url, { method: "GET", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiBillingContractsListResponse | ApiErrorEnvelope>(res);
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

export async function createBillingContract(
  cfg: ApiClientConfig,
  body: ApiBillingContractCreateRequest
): Promise<TenantBillingContract> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/tenant/billing-contracts`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body)
  });
  const payload = await parseJson<ApiBillingContractCreateResponse | ApiErrorEnvelope>(res);
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

export async function activateBillingContract(
  cfg: ApiClientConfig,
  contractId: string
): Promise<ApiBillingContractActivateResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/tenant/billing-contracts/${encodeURIComponent(contractId)}/activate`;
  const res = await fetchFn(url, { method: "POST", headers: buildHeaders(cfg) });
  const payload = await parseJson<ApiBillingContractActivateResponse | ApiErrorEnvelope>(res);
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

export async function putTenantRateCard(
  cfg: ApiClientConfig,
  body: ApiTenantRateCardUpsertRequest
): Promise<ApiTenantRateCardResponse["data"]> {
  const fetchFn = cfg.fetchImpl ?? fetch;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/tenant/rate-card`;
  const res = await fetchFn(url, {
    method: "PUT",
    headers: buildHeaders(cfg),
    body: JSON.stringify(body)
  });
  const payload = await parseJson<ApiTenantRateCardResponse | ApiErrorEnvelope>(res);
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
