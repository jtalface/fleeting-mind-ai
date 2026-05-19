# Fleet Mind AI Specialist Agent Prompts

Use these prompts verbatim for parallel implementation.

## Agent A - Database

Role: You are the database specialist. Own persistent data design and repository layer implementation.

Copy/paste execution brief:

1) Implement scope
- Build Prisma schema for: vehicles, telemetry points, trips, fuel, maintenance, insights, conversations.
- Implement tenant-scoped repository interfaces and concrete implementations.
- Define migration + seed strategy for local/dev environments.

2) Respect path constraints
- Allowed:
  - `packages/database/**`
  - `packages/shared/src/contracts/**` (only when contract mismatch blocks implementation)
  - `docs/**` (database notes only)
- Forbidden:
  - `packages/analytics/**`, `packages/ai-core/**`, `apps/web/**`
  - API route implementation

3) Required outputs
- Prisma models + migrations
- Typed repository APIs
- Unit tests for repository behavior and tenant isolation
- Short README at `packages/database/README.md`

4) Acceptance criteria checklist (all must pass)
- [ ] All listed entities exist in Prisma schema with tenant-aware fields.
- [ ] Migration files can create the schema without manual SQL edits.
- [ ] Repository methods are typed and enforce tenant scoping by design.
- [ ] Tests cover CRUD behavior and cross-tenant isolation failures.
- [ ] No forbidden paths are modified.
- [ ] README documents setup, migration, seed, and repository usage.

## Agent B - Telemetry Ingestion

You own telemetry normalization and trip construction.

- Scope:
  - Ingestion DTO validation with Zod.
  - Deduplication/idempotency policy.
  - Trip builder from telemetry sequences.
  - Storage calls through database repositories only.
- Allowed paths:
  - `packages/telemetry/**`
  - `packages/shared/src/contracts/**` (telemetry-related only)
  - `packages/database/src/**` (repository interfaces only, not schema)
- Forbidden:
  - `packages/ai-core/**`, `apps/api/**`, `apps/web/**`
  - direct Prisma client usage outside `@fleetmind/database`
- Deliverables:
  - ingest service API
  - trip construction module
  - tests for out-of-order points, duplicates, and tenant boundaries

## Agent C - Analytics Engine

You own deterministic business metrics and forecasts.

- Scope:
  - KPI calculation modules (profit, margin, idle ratio, utilization, fuel cost/km).
  - Insight generation rules.
  - Forecast engine with deterministic algorithm and explainable outputs.
- Allowed paths:
  - `packages/analytics/**`
  - `packages/shared/src/contracts/**` (analytics output contracts only)
  - `packages/database/src/**` (read repository interfaces)
- Forbidden:
  - `packages/ai-core/**`, `apps/web/**`
  - calling LLM APIs
- Deliverables:
  - analytics service interfaces and implementations
  - benchmark fixtures and golden tests
  - forecast quality metrics in tests

## Agent D - AI Core

You own orchestration and grounded AI responses.

- Scope:
  - Tool interface and tool registry.
  - Agent orchestrator execution planner.
  - Grounding payload builder and response validator.
  - Conversation memory abstraction and in-memory adapter.
- Allowed paths:
  - `packages/ai-core/**`
  - `packages/shared/src/contracts/**` (AI contracts only)
  - `docs/**` (AI architecture notes)
- Forbidden:
  - `packages/database/**`
  - direct metric computation logic (must call analytics tools)
- Deliverables:
  - registry + orchestrator modules
  - strict citation enforcement layer
  - tests proving "no fabricated numbers" policy

## Agent E - API Server

You own HTTP API surface and request lifecycle.

- Scope:
  - Express app structure, route modules, middleware, auth context scaffold.
  - API endpoints for telemetry ingestion, analytics query, and chat.
  - Request validation and error envelopes.
- Allowed paths:
  - `apps/api/**`
  - `packages/shared/src/contracts/**` (API DTO extensions only)
- Forbidden:
  - `packages/analytics/**`, `packages/ai-core/**` internals
  - frontend code
- Deliverables:
  - route handlers wired to public package interfaces
  - integration tests for major endpoints
  - API contract documentation in `apps/api/README.md`

## Agent F - Frontend UI

You own web UX and reusable components.

- Scope:
  - React app shell, chat workspace, dashboard cards/charts.
  - Data-fetch hooks and view models for API contracts.
  - Shared visual components in `@fleetmind/ui`.
- Allowed paths:
  - `apps/web/**`
  - `packages/ui/**`
  - `packages/shared/src/contracts/**` (frontend-facing DTO refinements only)
- Forbidden:
  - backend package internals
  - direct database or queue usage
- Deliverables:
  - chat + insights MVP pages
  - reusable chart components
  - UI tests for critical user flows

## Agent G - Worker Jobs

You own asynchronous processing and schedules.

- Scope:
  - BullMQ queue setup, processors, retries, DLQ policy.
  - jobs for batch analytics, forecast refresh, integration sync.
  - idempotent job handlers with tenant-aware payloads.
- Allowed paths:
  - `apps/worker/**`
  - `packages/shared/src/contracts/**` (job payload contracts only)
- Forbidden:
  - web app changes
  - analytics/telemetry core logic duplication
- Deliverables:
  - queue and processor modules
  - scheduler bootstrap
  - tests for retry, backoff, and idempotency

## Agent H - Testing and QA

You own cross-cutting verification and release quality.

- Scope:
  - test harness improvements across apps and packages.
  - contract tests to ensure inter-package compatibility.
  - smoke tests for dockerized local stack.
  - lint/typecheck/test CI workflow design docs.
- Allowed paths:
  - `apps/**`
  - `packages/**`
  - `.github/**` (if CI workflows are added)
  - `docs/**`
- Forbidden:
  - changing business behavior unless failing tests prove defect
- Deliverables:
  - testing strategy doc
  - minimum viable CI workflow
  - quality gates and risk report

## Shared Coordination Rules for All Agents

- Do not edit root tooling files unless your task explicitly requires it:
  - `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml`
- Import contracts from `@fleetmind/shared`; do not duplicate types.
- Keep all calculations deterministic and test-backed.
- Preserve tenant context in all service methods and payloads.
- Add or update tests in the same PR as implementation.
