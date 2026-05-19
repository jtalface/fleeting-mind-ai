import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { ApiRuntime } from "./runtime.js";

const memoryRuntime = new ApiRuntime({ storage: "memory" });
const createTestApp = () => createApp({ runtime: memoryRuntime });

const authHeaders = {
  "x-tenant-id": "tenant_integration",
  "x-user-id": "user_api_test",
  "x-request-id": "req_test"
};

describe("api endpoints", () => {
  it("ingests telemetry and deduplicates repeated payloads", async () => {
    const app = createTestApp();
    const payload = {
      point: {
        vehicleId: "veh_test_1",
        timestamp: "2026-05-07T00:00:00.000Z",
        latitude: 40.7128,
        longitude: -74.006,
        speedKph: 45,
        source: "device"
      }
    };

    const firstResponse = await request(app).post("/v1/telemetry/ingest").set(authHeaders).send(payload).expect(200);
    expect(firstResponse.body.data.deduplicated).toBe(false);

    const secondResponse = await request(app).post("/v1/telemetry/ingest").set(authHeaders).send(payload).expect(200);
    expect(secondResponse.body.data.deduplicated).toBe(true);
  });

  it("returns analytics report for the requested window", async () => {
    const app = createTestApp();
    const response = await request(app)
      .post("/v1/analytics/query")
      .set(authHeaders)
      .send({
        window: {
          start: "2026-05-01T00:00:00.000Z",
          end: "2026-05-07T00:00:00.000Z"
        },
        horizonDays: 5
      })
      .expect(200);

    expect(response.body.data).toHaveProperty("kpis");
    expect(response.body.data).toHaveProperty("insights");
    expect(response.body.data).toHaveProperty("forecasts");
    expect(Array.isArray(response.body.data.forecasts)).toBe(true);
  });

  it("processes a chat turn through orchestrator", async () => {
    const app = createTestApp();
    const response = await request(app)
      .post("/v1/chat")
      .set(authHeaders)
      .send({
        conversationId: "conv_api_test",
        question: "How is fleet profitability trending?"
      })
      .expect(200);

    expect(response.body.data).toHaveProperty("answer");
    expect(response.body.data).toHaveProperty("confidence");
    expect(Array.isArray(response.body.data.citedFacts)).toBe(true);
    expect(response.body.data.citedFacts.length).toBeGreaterThan(0);
    expect(response.body.data.citedFacts.some((f: { toolName: string }) => f.toolName === "get_profitability_summary")).toBe(
      true
    );
  });

  it("returns error envelope for missing auth context", async () => {
    const app = createTestApp();
    const response = await request(app)
      .post("/v1/chat")
      .send({
        conversationId: "conv_missing_auth",
        question: "Hello"
      })
      .expect(401);

    expect(response.body.error.code).toBe("AUTH_CONTEXT_MISSING");
    expect(response.body.error).toHaveProperty("requestId");
  });
});
