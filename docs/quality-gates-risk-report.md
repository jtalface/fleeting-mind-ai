# Quality Gates and Risk Report

## Release Quality Gates

- Lint must pass across all apps and packages.
- Typecheck must pass across all apps and packages.
- Unit and integration tests must pass across all apps and packages.
- Contract compatibility tests in `@fleetmind/shared` must pass.
- Docker smoke tests must pass for release candidate validation (`RUN_DOCKER_SMOKE=1`).

## Risk Register

### 1) Inter-package contract drift

- Risk: package outputs evolve and silently break consumers.
- Impact: runtime regressions in API/chat/analytics surfaces.
- Mitigation: shared contract compatibility tests and CI-required `test` gate.
- Residual risk: moderate, reduced as contract assertions expand.

### 2) Environment mismatch between local and CI

- Risk: dev stack dependencies differ from expected runtime behavior.
- Impact: failures appear late in release cycle.
- Mitigation: dockerized smoke tests against Redis/Postgres ports.
- Residual risk: moderate, further reduction requires service-level readiness checks.

### 3) Slow feedback due to broad monorepo checks

- Risk: long CI cycles reduce iteration speed and increase merge conflicts.
- Impact: lower developer throughput.
- Mitigation: keep MVP pipeline simple, optimize later with caching and selective jobs.
- Residual risk: low to moderate.

### 4) Insufficient negative-path coverage

- Risk: error envelopes and invalid payload handling regress.
- Impact: production reliability and support burden.
- Mitigation: continue adding endpoint-level integration tests for invalid inputs and auth failures.
- Residual risk: moderate.

## Current Recommendation

- Keep the current MVP gates mandatory for all PRs.
- Use docker smoke tests for release candidates and staging cutovers.
- Expand contract assertions whenever a public contract changes.
