# Fleet Mind AI — 2-Week Implementation Plan

Assumes **external Fleet Metrics APIs** provide vehicle location, speed, fuel, and related telemetry.

## Week 1 — Data plane + integrations

| Day | Owner | Deliverable |
|-----|-------|-------------|
| 1 | A | Prisma: `externalId` on vehicles, `IntegrationSyncState`, migration deploy |
| 1–2 | B + Integrations | `packages/integrations`: HTTP client, sync runner, env config |
| 2 | B | Sync: external vehicles → upsert vehicles → ingest telemetry (`partner_api`) |
| 3 | E | API runtime on **Postgres** (not in-memory); `POST /v1/integrations/sync` |
| 3 | G | Worker: real `IntegrationSyncRunner`, scheduled `partner_api` sync |
| 4 | C | `buildDailyHistoryFromRepositories` for forecast input |
| 4 | G | Batch analytics: compute KPIs + **persist insights** |
| 5 | H | Contract + integration tests, docker smoke |

## Week 2 — Product + AI hardening

| Day | Owner | Deliverable |
|-----|-------|-------------|
| 6 | E | Analytics/chat tools read Prisma data; remove hardcoded forecast history |
| 7 | D | Optional LLM adapter behind feature flag; keep grounding validator |
| 8 | F | Insights page: persisted insights + sync status |
| 9 | E | API key auth scaffold (`x-api-key`) + tenant headers |
| 10 | H | CI: migrate + test; quality gates doc update |

## Environment (external API)

```bash
FLEET_METRICS_API_BASE_URL=https://your-api.example.com
FLEET_METRICS_API_KEY=your-secret
FLEET_METRICS_API_TIMEOUT_MS=30000
# Optional path overrides (defaults shown)
FLEET_METRICS_VEHICLES_PATH=/vehicles
FLEET_METRICS_TELEMETRY_PATH=/vehicles/{vehicleId}/telemetry
```

## Architecture flow (target)

```text
External Metrics API
  → @fleetmind/integrations (HTTP client + normalize)
  → @fleetmind/telemetry (ingest + trips)
  → @fleetmind/database (Prisma)
  → @fleetmind/analytics (KPIs + insights + forecasts)
  → apps/api (REST + chat tools)
  → apps/web (dashboards)
```

## Parallel agent waves

1. **Wave 1:** Agent A (schema) — blocks B/G  
2. **Wave 2:** Integrations + B + G (after schema)  
3. **Wave 3:** C + E (analytics + API)  
4. **Wave 4:** F + H (UI + QA)
