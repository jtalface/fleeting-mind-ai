# Fleet Mind AI

Monorepo foundation for a production-grade SaaS platform that ingests telemetry, computes deterministic fleet analytics, and serves grounded AI copilots.

## Quick Start

1. `cp .env.example .env` — set `FLESPI_TOKEN` and other secrets
2. `pnpm install`
3. `pnpm dev:setup` — Docker (Postgres + Redis), migrate, seed
4. `pnpm dev:all` — API + worker + web on localhost

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:4000/health |
| Chat | http://localhost:5173/chat |
| Insights | http://localhost:5173/insights |
| Predictions | http://localhost:5173/predictions |
| Finance (rate card & contracts) | http://localhost:5173/settings |
| Map | http://localhost:5173/map |

**Migrations** (from repo root, uses `.env`):

```bash
pnpm --filter @fleetmind/database prisma:migrate:deploy
```

**LLM insights** — set `OPENAI_API_KEY` and optionally `LLM_MODEL` (e.g. `gpt-5-nano`). On startup the API logs `Insights: LLM (...)` or `Insights: rules`. Insights are narrated from KPI + forecast snapshots; KPIs and forecasts stay deterministic.

### First Flespi sync (after `dev:all` is running)

```bash
curl -X POST http://localhost:4000/v1/integrations/backfill \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"deviceNameIncludes":"Sweeper","lookbackDays":7,"maxPagesPerDevice":3}'
```

### Score forecasts (Predictions tab)

```bash
curl -X POST http://localhost:4000/v1/predictions/refresh \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"horizonDays":7,"lookbackDays":7}'
```

Then open **Predictions** in the web app or `GET /v1/predictions` (includes daily **actuals** overlay and evaluation history).

**Automatic refresh** (worker + Redis):

```env
WORKER_SCHEDULER_ENABLED=true
WORKER_SCHEDULED_TENANT_IDS=tenant_demo
WORKER_SCHEDULED_LOOKBACK_DAYS=7
WORKER_SCHEDULED_FORECAST_HORIZON_DAYS=7
```

Pipeline order every 6h (default): Flespi incremental sync → batch analytics → forecast/predictions cache (7d UTC window, 7d horizon).

**Phase 2.1 — trust & data quality**

- Prediction runs are **appended** (history kept) and forward accuracy is scored when the forecast horizon has passed.
- `GET /v1/predictions/forward-accuracy` — realized vs P50 for mature runs.
- `GET /v1/predictions/evaluation-trends` — MAPE over time (holdout + forward).
- Weekly **deep backfill** (optional): `WORKER_CRON_DEEP_BACKFILL=0 3 * * 0` with `WORKER_DEEP_BACKFILL_LOOKBACK_DAYS=30`.

**Phase 2b — finance truth**

- KPI revenue/cost use **tenant rate card** (km × rates). Seed activates a demo municipal sweeper contract (3.2 / 0.85 USD per km).
- **Finance** tab: edit rate card manually or manage billing contracts; **Activate** syncs rates to the rate card.
- Insights and Predictions show a **KPIs vs forecasts** callout (window totals vs daily P50 medians).
- API: `GET/PUT /v1/tenant/rate-card`, `GET/POST /v1/tenant/billing-contracts`, `POST /v1/tenant/billing-contracts/:id/activate`.

**Phase 3 — richer forecasting**

- **Per-vehicle** predictions for the top N vehicles by window revenue (default 5).
- **Configurable segment scopes** via env or refresh body — no hardcoded Sweeper default.
- Scopes on each refresh: fleet + segments + top vehicles.

```env
# JSON array of { "scopeKey", "nameIncludes" } — example:
FORECAST_SEGMENT_SCOPES=[{"scopeKey":"Sweeper","nameIncludes":"Sweeper"}]
FORECAST_TOP_VEHICLES=5
WORKER_FORECAST_SEGMENT_SCOPES=[{"scopeKey":"Sweeper","nameIncludes":"Sweeper"}]
WORKER_FORECAST_TOP_VEHICLES=5
```

```bash
curl -X POST http://localhost:4000/v1/predictions/refresh \
  -H "x-tenant-id: tenant_demo" -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"horizonDays":7,"lookbackDays":7,"topVehicles":5,"segmentScopes":[{"scopeKey":"Sweeper","nameIncludes":"Sweeper"}]}'
```

### Prune pre-LLM insights (optional)

When `OPENAI_API_KEY` is set, analytics refresh drops legacy rule-based rows (`insight_idle_*`, `insight_fleet_*`, `insight_fuel_*`) from the DB and from API responses. To clean up without opening Insights:

```bash
curl -X POST http://localhost:4000/v1/insights/prune-legacy \
  -H "x-tenant-id: tenant_demo" -H "x-user-id: user_local"
```

## Architecture and Agent Handoff

- `docs/architecture.md`: architecture blueprint, contracts, boundaries, and dependency graph.
- `docs/agent-prompts.md`: isolated implementation prompts for specialist agents A-H.
- `docs/forecasting-roadmap.md`: Phase 4a (data), 4b (features/ML), 4c (scenarios) backlog after Phase 3; includes what **mart** means in this repo.
