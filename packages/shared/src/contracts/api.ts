import type { AnalyticsReport } from "./analytics.js";
import type { IntegrationSyncResult } from "./integrations.js";
import type { CopilotResponse } from "./ai.js";
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
