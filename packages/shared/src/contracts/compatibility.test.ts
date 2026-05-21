import { describe, expect, it } from "vitest";
import type {
  AnalyticsReport,
  ApiAnalyticsQueryResponse,
  ApiChatResponse,
  ApiTelemetryIngestResponse,
  CopilotResponse,
  TelemetryIngestResult
} from "./index.js";
import {
  batchAnalyticsJobPayloadSchema,
  forecastRefreshJobPayloadSchema,
  integrationSyncJobPayloadSchema
} from "./jobs.js";

type Assert<T extends true> = T;
type IsAssignable<From, To> = From extends To ? true : false;

type _TelemetryContractCompatible = Assert<
  IsAssignable<ApiTelemetryIngestResponse["data"], TelemetryIngestResult>
>;
type _AnalyticsContractCompatible = Assert<
  IsAssignable<ApiAnalyticsQueryResponse["data"], AnalyticsReport>
>;
type _ChatContractCompatible = Assert<IsAssignable<ApiChatResponse["data"], CopilotResponse>>;

describe("shared contract compatibility", () => {
  it("accepts valid batch analytics job payload", () => {
    const parsed = batchAnalyticsJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      asOf: "2026-05-07T00:00:00.000Z",
      windowPreset: "explicit",
      windowStart: "2026-05-01T00:00:00.000Z",
      windowEnd: "2026-05-07T00:00:00.000Z"
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects explicit batch analytics payloads without window bounds", () => {
    const parsed = batchAnalyticsJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      asOf: "2026-05-07T00:00:00.000Z",
      windowPreset: "explicit"
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts forecast refresh payload with bounded horizon", () => {
    const parsed = forecastRefreshJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      asOf: "2026-05-07T00:00:00.000Z",
      horizonDays: 30,
      windowPreset: "last_24h_utc"
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts last_7d_utc window preset", () => {
    const parsed = forecastRefreshJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      asOf: "2026-05-07T00:00:00.000Z",
      horizonDays: 7,
      windowPreset: "last_7d_utc"
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts last_30d_utc window preset", () => {
    const parsed = forecastRefreshJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      asOf: "2026-05-07T00:00:00.000Z",
      horizonDays: 7,
      windowPreset: "last_30d_utc"
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts integration sync payload with known connector", () => {
    const parsed = integrationSyncJobPayloadSchema.safeParse({
      tenantId: "tenant_1",
      connector: "partner_api"
    });
    expect(parsed.success).toBe(true);
  });
});
