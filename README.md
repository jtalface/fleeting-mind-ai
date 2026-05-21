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

Then open **Predictions** in the web app or `GET /v1/predictions`.

## Architecture and Agent Handoff

- `docs/architecture.md`: architecture blueprint, contracts, boundaries, and dependency graph.
- `docs/agent-prompts.md`: isolated implementation prompts for specialist agents A-H.
