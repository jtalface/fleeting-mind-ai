import type { AnalyticsReport } from "./analytics.js";
import type { CopilotResponse } from "./ai.js";
import type { TelemetryIngestInput, TelemetryIngestResult } from "./telemetry.js";
export interface ApiTelemetryIngestRequest extends TelemetryIngestInput {
}
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
export interface ApiErrorEnvelope {
    error: {
        code: string;
        message: string;
        requestId: string;
        details?: unknown;
    };
}
//# sourceMappingURL=api.d.ts.map