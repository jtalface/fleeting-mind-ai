# Fleet Mind AI Testing Strategy

## Goals

- Catch regressions early across apps and shared packages.
- Enforce compatibility between public contracts used across boundaries.
- Keep local verification fast while preserving confidence for release.

## Test Pyramid by Layer

- Unit tests (majority): deterministic behavior in package-level modules.
- Integration tests (targeted): API routes, orchestration, and queue workflows.
- Contract tests (cross-cutting): assertions around shared DTOs and job schemas.
- Smoke tests (environment): dockerized dependencies (Postgres, Redis) reachable and healthy.

## Harness Improvements

### Standard package commands

Every app and package exposes the same test quality scripts:

- `lint`
- `typecheck`
- `test`

At monorepo level, these are executed via:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

This keeps local and CI verification consistent and reduces "works on my machine" drift.

### Shared contract test suite

`packages/shared/src/contracts/compatibility.test.ts` provides a compatibility gate for:

- API DTOs matching telemetry and analytics shared outputs.
- AI tool outputs preserving required fields consumed by API/app layers.
- Job schemas accepting and rejecting expected payload shapes.

## Contract Testing Plan

- Keep compatibility tests inside `@fleetmind/shared` since it owns public contracts.
- Add compile-time type assertions for shape compatibility.
- Add runtime schema assertions for Zod-backed contracts (`jobs.ts`).
- Run contract tests on every PR in CI.

## Dockerized Stack Smoke Tests

`apps/api/src/smoke/docker-stack.smoke.test.ts` verifies local stack dependencies:

- Redis TCP port is reachable.
- Postgres TCP port is reachable.

By default these tests are skipped unless `RUN_DOCKER_SMOKE=1`, so normal CI remains fast while local release checks can include environment smoke validation.

## CI Workflow Design

The MVP workflow in `.github/workflows/ci.yml` is designed for fast feedback:

1. Install dependencies with pnpm.
2. Run monorepo lint.
3. Run monorepo typecheck.
4. Run monorepo tests.

This enforces a minimum release gate while staying simple to maintain.
