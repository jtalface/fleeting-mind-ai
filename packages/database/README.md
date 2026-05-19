# @fleetmind/database

Database package for Fleet Mind persistence concerns.

## What this package owns

- Prisma schema and migrations for `Vehicle`, `TelemetryPoint`, `Trip`, `FuelReading`, `MaintenanceRecord`, `Insight`, `Conversation`, and `ConversationMessage`.
- Tenant-scoped repository contracts and concrete implementations.
  - In-memory implementation for fast unit tests.
  - Prisma-backed implementation for persistent storage.
- Seed entrypoint for local development.

## Key commands

- `pnpm --filter @fleetmind/database prisma:generate`
- `pnpm --filter @fleetmind/database prisma:migrate:dev`
- `pnpm --filter @fleetmind/database prisma:seed`
- `pnpm --filter @fleetmind/database test`

## Tenant isolation model

- Every persisted entity includes `tenantId`.
- Repository instances are created per tenant and never return records from another tenant.
- Unit tests in `src/repositories/in-memory.test.ts` and `src/repositories/prisma.test.ts` verify tenant boundaries.
