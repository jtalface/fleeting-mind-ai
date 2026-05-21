import type { BillingContractListResult, CreateBillingContractInput, TenantBillingContract } from "./billing-contracts.js";
import type { AnalyticsReport } from "./analytics.js";
import type { IntegrationSyncResult } from "./integrations.js";
import type { CopilotResponse } from "./ai.js";
import type {
  EvaluationTrendsResult,
  ForecastEvaluationListResult,
  ForwardAccuracyListResult,
  PredictionsListResult
} from "./predictions.js";
import type { TelemetryIngestInput, TelemetryIngestResult } from "./telemetry.js";

export interface ApiTelemetryIngestRequest extends TelemetryIngestInput {}

export interface ApiTelemetryIngestResponse {
  data: TelemetryIngestResult;
}

export interface ApiAnalyticsQueryRequest {
  window: {
    start: string;
    end: string;
  };
  horizonDays?: number;
}

export interface ApiAnalyticsQueryResponse {
  data: AnalyticsReport;
}

export interface ApiChatRequest {
  conversationId: string;
  question: string;
}

export interface ApiChatResponse {
  data: CopilotResponse;
}

export interface ApiInsightsListResponse {
  data: AnalyticsReport["insights"];
}

export interface ApiInsightsPruneLegacyResponse {
  data: {
    deleted: number;
  };
}

export interface ApiPredictionsListResponse {
  data: PredictionsListResult;
}

export interface ApiPredictionsEvaluationsResponse {
  data: ForecastEvaluationListResult;
}

export interface ApiPredictionsForwardAccuracyResponse {
  data: ForwardAccuracyListResult;
}

export interface ApiPredictionsEvaluationTrendsResponse {
  data: EvaluationTrendsResult;
}

export interface ApiPredictionsRefreshRequest {
  horizonDays?: number;
  /** Days of history used to train forecasts (default 7). */
  lookbackDays?: number;
  /** Segment scopes; when omitted, uses FORECAST_SEGMENT_SCOPES env (default none). */
  segmentScopes?: Array<{ scopeKey: string; nameIncludes: string }>;
  /** Forecast top N vehicles by window revenue (default 5; 0 disables). */
  topVehicles?: number;
}

export interface ApiPredictionsRefreshResponse {
  data: PredictionsListResult;
}

export interface TenantRateCardDto {
  tenantId: string;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency: string;
  sourceContractId?: string;
}

export interface ApiTenantRateCardResponse {
  data: TenantRateCardDto;
}

export interface ApiTenantRateCardUpsertRequest {
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency?: string;
}

export interface ApiBillingContractsListResponse {
  data: BillingContractListResult;
}

export interface ApiBillingContractCreateRequest extends CreateBillingContractInput {}

export interface ApiBillingContractCreateResponse {
  data: TenantBillingContract;
}

export interface ApiBillingContractActivateResponse {
  data: {
    contract: TenantBillingContract;
    rateCard: TenantRateCardDto;
  };
}

export interface FleetVehicleLocationDto {
  vehicleId: string;
  plateNumber?: string;
  externalId?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speedKph?: number;
  status: "moving" | "idle" | "offline";
}

export interface ApiFleetLocationsResponse {
  data: {
    vehicleCount: number;
    locatedCount: number;
    vehicles: FleetVehicleLocationDto[];
  };
}

export interface ApiIntegrationStatusResponse {
  data: {
    configured: boolean;
    connector: string;
    lastStatus?: string;
    lastSyncedAt?: string;
    lastError?: string;
    cursor?: string;
  };
}

export interface ApiIntegrationSyncResponse {
  data: {
    status: "completed";
    connector: string;
    result: IntegrationSyncResult;
    insightsGenerated?: number;
  };
}

export interface ApiIntegrationPreviewResponse {
  data: {
    totalDevices: number;
    matchedDevices: number;
    sample: Array<{ id: string; name?: string; vin?: string }>;
    matched: Array<{ id: string; name?: string; vin?: string }>;
    recommendedBackfill: {
      maxDevices: number;
      lookbackDays: number;
      maxPagesPerDevice: number;
      estimatedMaxMessages: number;
    };
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}
