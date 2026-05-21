# Forecasting roadmap — Phase 4a / 4b / 4c

This document turns the post–Phase 3 ML review into an implementation backlog aligned with the `fleet-intelligence-ai` monorepo.

**Completed context:** Phases 0–3 deliver ingest → daily mart → univariate champion forecasts → cache/eval UI → finance rate cards → fleet/segment/vehicle scopes.

---

## What “mart” means in this repo

**Mart** is short for **data mart**: a **pre-aggregated, analytics-ready table** built from raw operational data so dashboards and models do not re-scan every trip and telemetry point on each request.

In Fleet Mind AI the mart is implemented as:

| Concept | In code / DB |
|--------|----------------|
| Mart builder | `packages/analytics/src/daily-mart.ts` → `rebuildDailyMart()`, `buildVehicleDailyRows()` |
| Stored mart | Prisma model `FleetMetricDaily` (`packages/database/prisma/schema.prisma`) |
| Row grain | **One row per tenant × vehicle × calendar day** |
| Measures | `revenue`, `operatingCost`, `fuelCost`, `distanceKm`, `tripCount`, `idleRatioPct`, `utilizationPct` |

### How a mart row is produced

```text
Flespi / trips / fuel (raw)
        ↓
Trip daily rollup (km spread across trip days, × tenant rate card)
        ↓
buildVehicleDailyRows()  — per vehicle, per date
        ↓
fleetMetricDaily.upsertMany()  — Postgres (or in-memory martStore in dev)
        ↓
Consumers:
  • KPIs (window sums / averages)
  • buildDailyHistoryFromRepositories() — sum/average by day → forecast input series
  • Phase 3 vehicle scopes — filter mart by vehicleId
```

**Revenue on the mart** is not imported from an accounting system today; it is **derived**:

`revenue ≈ Σ (trip.distanceKm × rateCard.revenuePerKm)` (plus fuel/cost rules in `trip-daily-rollup.ts`).

So when docs say “scenario on top of the mart,” they mean: change rate card, distance, or utilization assumptions and **recompute or rescale** those daily rows (or a copy) without retraining a black-box model first.

### Mart vs other layers

| Layer | Role |
|-------|------|
| **Raw** | `TelemetryPoint`, `Trip`, `FuelReading` — event grain |
| **Mart** | `FleetMetricDaily` — stable daily features per vehicle |
| **History series** | `AnalyticsDataPoint[]` — fleet or segment **aggregated** by day (from mart or trips) |
| **Prediction runs** | `PredictionRun` + points — forecast outputs (P10/P50/P90) |

The champion engine (`packages/analytics/src/forecast/champion-engine.ts`) trains on **history series**, which are usually fed from the mart (or trips if the mart is too sparse).

---

## Phase 4a — Data trust & history (foundation)

**Goal:** Forecast error reflects reality, not bad labels or short windows. Unlock 30–90d training and honest eval.

### 4a.1 History window & scheduler

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4a.1.1 | Extend default training lookback to 30d (configurable 7–90d) for refresh and worker | **Done** — `forecast-lookback.ts`, worker scheduler split, API refresh default |
| 4a.1.2 | Keep 7d “hot” refresh for ops; document when to use deep backfill + long lookback | **Done** — `ANALYTICS_HOT_LOOKBACK_DAYS` / `WORKER_SCHEDULED_LOOKBACK_DAYS`; deep backfill unchanged |

### 4a.2 Frozen actuals for evaluation

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4a.2.1 | Snapshot table or `asOf` column set: daily actuals used when a `PredictionRun` was scored | New migration, `persist-forecast-evaluations.ts`, `forward-accuracy.ts` |
| 4a.2.2 | Forward scoring reads frozen actuals, not recomputed mart after the fact | `forward-accuracy.ts`, `prediction-history.ts` |

### 4a.3 Data quality & coverage

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4a.3.1 | Mart QA metrics: % days with trips, gap days, vehicles with zero distance, duplicate trip flags | **Done** — `mart-quality.ts`, `GET /v1/analytics/mart-quality` |
| 4a.3.2 | Surface QA on Predictions / Insights (banner when history &lt; N days or coverage &lt; threshold) | **Done** — `MartQualityBanner` on Insights + Predictions |

### 4a.4 Finance reconciliation

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4a.4.1 | Define `revenueSource`: `derived_km_rate` \| `contract_import` (future) | `packages/shared`, tenant settings |
| 4a.4.2 | Report delta: mart revenue vs active billing contract expectation for window | `TenantBillingContract`, `rate-card.ts`, optional admin callout on Finance settings |

### 4a.5 Segment config (productized)

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4a.5.1 | Persist tenant segment definitions (replace env-only JSON) | New `TenantForecastSegment` model or settings JSON |
| 4a.5.2 | CRUD API + Finance or Settings UI for segments | `apps/api/src/routes.ts`, `FinanceSettingsPage` or new page |

**4a exit criteria**

- [ ] 30d+ history available for `tenant_demo` after backfill  
- [ ] Forward MAPE stable when mart is rebuilt (frozen actuals)  
- [ ] Mart QA visible in UI; refresh blocked or warned when coverage &lt; threshold  

---

## Phase 4b — Features & multivariate revenue modeling

**Goal:** Revenue forecast uses drivers (distance, utilization, rate, calendar), not only past revenue. Coherent fleet vs vehicle story.

### 4b.1 Feature store on the mart

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4b.1.1 | Extend `FleetMetricDaily` (or `FleetMetricDailyFeatures`) with: `dayOfWeek`, `isHoliday`, `activeVehicleCount`, `rateRevenuePerKm`, `rateCostPerKm` | `schema.prisma`, `daily-mart.ts` |
| 4b.1.2 | Optional external calendar feed (tenant holidays / municipal schedule) | `packages/integrations` or static tenant config |
| 4b.1.3 | Versioned mart rebuild job id / `builtAt` for reproducibility | `rebuildDailyMart`, worker batch job metadata |

### 4b.2 Multivariate revenue model (v1)

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4b.2.1 | Feature matrix per scope-day: lags, DOW, rolling distance, utilization, idle, rate | New `packages/analytics/src/forecast/feature-matrix.ts` |
| 4b.2.2 | Add champion candidate: regularized linear / ridge on features (keep existing univariate champions as fallback) | `forecast/backtest.ts`, `champion-engine.ts` |
| 4b.2.3 | Train revenue (and optionally profit) with multivariate; keep other metrics univariate initially | `service.ts`, `run-batch-predictions.ts` |

### 4b.3 Hierarchical coherence

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4b.3.1 | Bottom-up fleet revenue = Σ top-N vehicle revenue forecasts (reconcile or show explicit gap) | `run-batch-predictions.ts`, `PredictionsPage` “reconciliation” row |
| 4b.3.2 | Segment forecasts as sum of vehicles matching `nameIncludes` (optional) | `vehicle-group-metrics.ts`, scopes |

### 4b.4 Calibration & model cards

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4b.4.1 | Band coverage metric (% actuals inside P10–P90) per scope/metric | `persist-forecast-evaluations.ts`, API trends |
| 4b.4.2 | Benchmarks: seasonal naive vs champion on same window | `forward-accuracy.ts`, UI table |
| 4b.4.3 | Model card API: data range, champion, MAPE, coverage, last refresh, known warnings | `GET /v1/predictions/model-cards` |
| 4b.4.4 | Per-horizon MAPE (day 1 … day H) | eval schema + Predictions trust panel |

### 4b.5 Explainability

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4b.5.1 | Forecast explanation: top drivers (Δ distance, Δ utilization, rate) for multivariate | `ForecastExplanation` in `packages/shared/contracts/analytics.ts` |
| 4b.5.2 | LLM insights consume driver summary, not only P50 | `insight-context.ts`, `ai-core` |

**4b exit criteria**

- [ ] Revenue champion beats “same weekday last week” on 30d backtest for at least one tenant  
- [ ] P10–P90 coverage within ±15% of nominal on holdout  
- [ ] Model card linked from Predictions page per scope  

---

## Phase 4c — Scenarios & revenue decisions (prescriptive layer)

**Goal:** Answer “what if?” and rank actions — not only “what will happen?”

### 4c.1 Deterministic scenario engine (mart + rate card)

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4c.1.1 | Scenario spec: override `revenuePerKm`, `operatingCostPerKm`, `topVehicles`, segment filter, horizon | `packages/shared/contracts/scenarios.ts` |
| 4c.1.2 | `simulateScenario(input, spec)` → daily revenue/cost/profit path (no ML retrain) | New `packages/analytics/src/scenario-simulator.ts` |
| 4c.1.3 | API `POST /v1/analytics/scenarios` + compare to baseline forecast | `apps/api/src/routes.ts` |

### 4c.2 What-if UI

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4c.2.1 | Predictions or Finance: sliders for rate, idle reduction %, vehicles active | `apps/web` scenario panel |
| 4c.2.2 | Side-by-side chart: baseline P50 vs scenario path | `ForecastBandChart` or new component |

### 4c.3 Action recommendations (v1)

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4c.3.1 | Rule-based actions: “activate contract X”, “reduce idle on vehicle Y”, “raise rate within cap” | `packages/analytics/src/recommendations.ts` |
| 4c.3.2 | Each action: estimated Δ revenue, confidence from forecast MAPE | ties to model card |
| 4c.3.3 | Copilot tool `simulate_scenario` + `list_recommendations` | `apps/api/src/runtime.ts`, `ai-core` |

### 4c.4 Job / contract-aware scenarios (stretch)

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4c.4.1 | Import job calendar (dates, expected km) → adjust scenario distance | `TenantBillingContract.externalJobId`, integrations |
| 4c.4.2 | Forecast “scheduled km” vs “actual km” gap | mart + scenario |

### 4c.5 Workflow guardrails

| Item | Description | Primary touchpoints |
|------|-------------|---------------------|
| 4c.5.1 | Do-not-use flag when MAPE &gt; threshold or history &lt; N days | model card + UI |
| 4c.5.2 | Export scenario summary (CSV/PDF) for ops review | web + API |

**4c exit criteria**

- [ ] User can change rate ±10% and see Δ monthly revenue without rescoring ML  
- [ ] At least three ranked recommendations with $ impact for demo tenant  
- [ ] Copilot answers “what if we switch to municipal contract rates?” using scenario API  

---

## Suggested sequencing

```text
Phase 4a (4–6 weeks)  →  trust data, longer history, frozen eval, QA UI
        ↓
Phase 4b (6–8 weeks)  →  mart features, multivariate revenue, calibration, model cards
        ↓
Phase 4c (4–6 weeks)  →  scenario simulator, what-if UI, recommendations
```

Parallelizable after 4a.1: **4a.5** (segment UI) with **4c.1** (scenarios use same segment config).

---

## Dependency map (repo packages)

```text
packages/integrations  →  trips/telemetry
packages/telemetry     →  trips
packages/database      →  FleetMetricDaily, PredictionRun, contracts
packages/analytics     →  mart, history, forecast, scenarios (4c)
packages/ai-core       →  grounded narrative + tools
apps/worker            →  rebuild mart, refresh forecasts
apps/api               →  REST + chat tools
apps/web               →  Predictions, Finance, scenario UI
```

---

## Out of scope (later phases)

- Full MLOps (MLflow, shadow deploy, auto-retrain triggers)  
- Causal inference / price elasticity experiments  
- Real-time (hourly) forecasting  
- ERP / accounting actuals ingestion as source of truth  

These can follow once 4a–4c prove value on derived mart revenue for one tenant (e.g. `tenant_demo` + Sweeper segment).
