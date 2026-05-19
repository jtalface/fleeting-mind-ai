# @fleetmind/integrations

Connects Fleet Mind AI to telematics data sources.

## Flespi (recommended)

Uses the [flespi REST API](https://flespi.com/rest-api):

| Operation | Flespi endpoint |
|-----------|-----------------|
| List devices | `GET https://flespi.io/gw/devices/all` |
| Telemetry history | `GET https://flespi.io/gw/devices/{id}/messages` |

### Configuration

```bash
INTEGRATIONS_PROVIDER=flespi
FLESPI_TOKEN=your-flespi-token
FLESPI_MESSAGES_PAGE_SIZE=200
```

**Never commit real tokens.** Use `.env` locally only.

### Auth

```
Authorization: FlespiToken <FLESPI_TOKEN>
```

### Sync flow

1. List all flespi devices → upsert vehicles (`externalId` = flespi device id).
2. For each device, pull messages (incremental via `data={"from":<unix>}` cursor).
3. Ingest telemetry → build trips → persist to Postgres.
4. Worker/API analytics consume stored data.

### Sync endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/integrations/preview` | How many devices exist + safe backfill estimate |
| `POST /v1/integrations/backfill` | One-time capped history pull (default **10 devices**, 7 days) |
| `POST /v1/integrations/sync` | Incremental update (latest page per device) |

Example backfill (start small — first 10 devices):

```bash
curl -X POST http://localhost:4000/v1/integrations/backfill \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"maxDevices":10,"lookbackDays":7,"maxPagesPerDevice":3}'
```

**Only sweepers** (name contains `Sweeper`):

```bash
curl -X POST http://localhost:4000/v1/integrations/backfill \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"deviceNameIncludes":"Sweeper","lookbackDays":7,"maxPagesPerDevice":3}'
```

**Specific flespi device ids**:

```bash
curl -X POST http://localhost:4000/v1/integrations/backfill \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"deviceExternalIds":["6546042","6556011"],"lookbackDays":7,"maxPagesPerDevice":3}'
```

Preview matches before syncing:

```bash
curl "http://localhost:4000/v1/integrations/preview?deviceNameIncludes=Sweeper" \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local"
```

---

## Generic HTTP API (alternative)

```bash
INTEGRATIONS_PROVIDER=generic
FLEET_METRICS_API_BASE_URL=https://your-api.example.com
FLEET_METRICS_API_KEY=your-secret
```

See previous generic contract shapes in this file's git history or `docs/implementation-plan.md`.
