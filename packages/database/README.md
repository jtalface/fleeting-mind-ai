# @fleetmind/database

Database package for Fleet Mind persistence concerns.

## What this package owns

- Prisma schema and migrations for `Vehicle`, `TelemetryPoint`, `Trip`, `FuelReading`, `MaintenanceRecord`, `Insight`, `Conversation`, and `ConversationMessage`.
- Tenant-scoped repository contracts and concrete implementations.
  - In-memory implementation for fast unit tests.
  - Prisma-backed implementation for persistent storage.
- Seed entrypoint for local development.

## Key commands

Run from the **repo root** (`fleet-intelligence-ai/`). Scripts load `DATABASE_URL` from the root `.env` via `dotenv-cli`.

- `pnpm --filter @fleetmind/database prisma:generate`
- `pnpm --filter @fleetmind/database prisma:migrate:deploy` (apply migrations)
- `pnpm --filter @fleetmind/database prisma:migrate:dev` (create + apply in dev)
- `pnpm --filter @fleetmind/database prisma:seed`

Or one-shot setup (Docker + migrate + seed): `pnpm dev:setup`

If you call `prisma` directly, pass env explicitly:

`dotenv -e .env -- pnpm --filter @fleetmind/database exec prisma migrate deploy`
- `pnpm --filter @fleetmind/database test`

## Tenant isolation model

- Every persisted entity includes `tenantId`.
- Repository instances are created per tenant and never return records from another tenant.
- Unit tests in `src/repositories/in-memory.test.ts` and `src/repositories/prisma.test.ts` verify tenant boundaries.
