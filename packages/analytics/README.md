# @fleetmind/analytics

Deterministic analytics engine for fleet KPIs, insight rules, and explainable forecasts.

## Scope

This package owns:

- KPI calculation modules (`profit`, `profit_margin_pct`, `idle_ratio_pct`, `utilization_pct`, `fuel_cost_per_km`)
- Insight generation contract (`InsightGenerator`); default rule-based fallback in this package
- LLM insight narration lives in `@fleetmind/ai-core` (`createInsightGenerator`)
- Forecast engine with deterministic algorithm and explainable output

## Architecture

- `src/kpi.ts`: computes fleet and per-vehicle KPI snapshots over a custom time window
- `src/insights.ts`: rule-based fallback insights (`generateRuleBasedInsights`)
- `src/insight-context.ts`: builds forecast summaries for LLM insight prompts
- `src/rate-card.ts` + `src/daily-mart.ts`: tenant rate cards and vehicle-day mart rollups
- `src/forecast/champion-engine.ts`: backtested ETS / seasonal naive / gradient-boosting stumps
- `src/forecast.ts`: legacy linear regression (tests/comparisons only)
- `src/service.ts`: default orchestration service (`DefaultAnalyticsService`)
- `src/fixtures.ts`: benchmark fixture data and golden values for regression tests
- `src/service.test.ts`: KPI/insight behavior, golden forecast, and forecast quality tests

## KPI formulas

All metrics are deterministic and derived from trips + fuel readings.

- `revenue` = `sum(distance_km * revenue_per_km)` from `TenantRateCard` (default `2.1`)
- `cost` = `sum(fuel_total_cost) + sum(distance_km * operating_cost_per_km)` (default `0.6`)
- `profit` = `revenue - cost`
- `profit_margin_pct` = `(profit / revenue) * 100` (safe divide; returns `0` when revenue is `0`)
- `fuel_cost_per_km` = `sum(fuel_total_cost) / sum(distance_km)` (safe divide)
- `idle_ratio_pct` = `(total_idle_minutes / total_trip_minutes) * 100` (safe divide)
- `utilization_pct` = `((total_trip_minutes - total_idle_minutes) / total_trip_minutes) * 100` (safe divide)

Fleet-level KPI values are aggregated from per-vehicle values:

- additive metrics (`revenue`, `cost`, `profit`) are summed
- ratio metrics (`fuel_cost_per_km`, `idle_ratio_pct`, `utilization_pct`) are averaged across vehicles

## Insight rules

Current built-in rules:

- Fleet loss (`critical`): fleet `profit < 0`
- Vehicle idle warning (`warning`): vehicle `idle_ratio_pct >= 30`
- Vehicle fuel efficiency note (`info`): vehicle `fuel_cost_per_km >= 1.2`

Rules are implemented via `InsightRule` and can be composed/overridden.

## Forecasting approach

Forecasting is fully deterministic:

- Candidates: `seasonal_naive`, `ets` (Holt-Winters, period 7), `gradient_boosting_stumps`
- Rolling-origin backtest on the last 7 days (requires ≥14 history points) picks the champion by MAPE
- Explainability fields: `algorithm`, `championSelected`, `backtestMapePct`, `candidates`, `sampleSize`, `residualStdDev`
- Uncertainty band:
  - residual-based band = `1.96 * residualStdDev`
  - `lowerBound = predicted - band`
  - `upperBound = predicted + band`

## Forecast quality metrics

`DeterministicForecastEngine.evaluateQuality(...)` returns:

- `mae`: mean absolute error
- `mapePct`: mean absolute percentage error (safe handling for zero actuals)
- `withinBandPct`: percent of actual points inside `[lowerBand, upperBand]`

These metrics are validated in tests and can be used as release gates.

## Running locally

From repo root:

- `pnpm --filter @fleetmind/analytics test`
- `pnpm --filter @fleetmind/analytics typecheck`

## Extending safely

- Add new KPI metrics in `src/kpi.ts` and include matching shared contract updates in `packages/shared/src/contracts/analytics.ts`.
- Add new deterministic rules in `src/insights.ts` via `InsightRule`.
- Keep forecast algorithms deterministic and explainable; avoid any stochastic or LLM-driven model output in this package.

## Assumptions and known limitations

- Revenue and operating cost coefficients are fixed (`2.1` revenue/km and `0.6` operating cost/km) and should be revisited when business pricing changes.
- Fleet ratio KPIs are simple per-vehicle averages; they are not currently weighted by distance, trip duration, or asset utilization mix.
- Forecasting assumes approximately linear short-term trends and may underperform in strongly seasonal or regime-shift periods.
- Confidence bounds are residual-based normal approximations (`1.96 * stddev`) and do not model asymmetric or heavy-tail error distributions.
- Insight thresholds are static (`idle_ratio_pct >= 30`, `fuel_cost_per_km >= 1.2`) and not yet tenant-specific.
