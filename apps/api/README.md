# FleetMind API (`apps/api`)

HTTP API surface for telemetry ingestion, analytics queries, and AI chat.

## Request Lifecycle

1. `express.json()` parses request bodies.
2. `contextMiddleware` requires tenant/user headers and injects request context:
   - `x-tenant-id` (required)
   - `x-user-id` (required)
   - `x-request-id` (optional, generated if missing)
3. Route modules validate payloads with Zod.
4. Domain services from public package interfaces are invoked.
5. Errors are normalized by `errorMiddleware` into a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "requestId": "req_xxx",
    "details": {}
  }
}
```

## Endpoints

### `GET /health`

Unauthenticated health check.

### `POST /v1/telemetry/ingest`

Ingests one telemetry point and runs dedup/trip construction via `@fleetmind/telemetry`.

Request body:

```json
{
  "point": {
    "vehicleId": "veh_123",
    "timestamp": "2026-05-07T00:00:00.000Z",
    "latitude": 40.7128,
    "longitude": -74.006,
    "source": "device"
  }
}
```

Response body:

```json
{
  "data": {
    "telemetryPoint": {},
    "deduplicated": false,
    "createdTrips": []
  }
}
```

### `GET /v1/telemetry/vehicles/:vehicleId/timeline`

Returns sorted telemetry points and trips for a vehicle.

Optional query param:
- `limit`: telemetry point limit (default: `500`).

### `POST /v1/analytics/query`

Runs KPI/insight/forecast aggregation via `@fleetmind/analytics`.

Request body:

```json
{
  "window": {
    "start": "2026-05-01T00:00:00.000Z",
    "end": "2026-05-07T00:00:00.000Z"
  },
  "horizonDays": 7
}
```

Response body:

```json
{
  "data": {
    "tenantId": "tenant_123",
    "generatedAt": "2026-05-07T00:00:00.000Z",
    "kpis": {},
    "insights": [],
    "forecasts": []
  }
}
```

### `POST /v1/chat`

Runs one grounded AI turn via `@fleetmind/ai-core` orchestrator.

Request body:

```json
{
  "conversationId": "conv_123",
  "question": "How is fleet profitability trending?"
}
```

## Local Development

From repository root:

- `pnpm --filter @fleetmind/api dev` - run API server.
- `pnpm --filter @fleetmind/api test` - run integration-style endpoint tests.
- `pnpm --filter @fleetmind/api typecheck` - run TypeScript checks.
