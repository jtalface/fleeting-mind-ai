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

### First Flespi sync (after `dev:all` is running)

```bash
curl -X POST http://localhost:4000/v1/integrations/backfill \
  -H "x-tenant-id: tenant_demo" \
  -H "x-user-id: user_local" \
  -H "Content-Type: application/json" \
  -d '{"deviceNameIncludes":"Sweeper","lookbackDays":7,"maxPagesPerDevice":3}'
```

## Architecture and Agent Handoff

- `docs/architecture.md`: architecture blueprint, contracts, boundaries, and dependency graph.
- `docs/agent-prompts.md`: isolated implementation prompts for specialist agents A-H.
