import type {
  EvaluationTrendSeries,
  ForecastEvaluationEntry,
  ForwardAccuracyEntry,
  PredictionBundle
} from "@fleetmind/shared";
import { Card, ForecastBandChart, PageHeader } from "@fleetmind/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, postPredictionsRefresh } from "../api/client.js";
import { usePredictions } from "../hooks/usePredictions.js";
import { usePredictionsEvaluations } from "../hooks/usePredictionsEvaluations.js";
import {
  getPredictionsEvaluationTrends,
  getPredictionsForwardAccuracy
} from "../api/client.js";

export interface PredictionsPageProps {
  cfg: ApiClientConfig;
}

const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  cost: "Cost",
  profit: "Profit",
  fuel_cost_per_km: "Fuel cost / km",
  idle_ratio_pct: "Idle ratio %",
  utilization_pct: "Utilization %"
};

function scopeLabel(bundle: PredictionBundle): string {
  if (bundle.scopeType === "fleet") {
    return "Fleet-wide";
  }
  return `Segment: ${bundle.scopeKey}`;
}

export function PredictionsPage({ cfg }: PredictionsPageProps): JSX.Element {
  const [scopeType, setScopeType] = useState<"fleet" | "segment" | "all">("all");
  const [horizonDays, setHorizonDays] = useState(7);

  const queryOptions = useMemo(
    () => ({
      horizonDays,
      ...(scopeType === "fleet" ? { scopeType: "fleet" as const, scopeKey: "fleet" } : {}),
      ...(scopeType === "segment" ? { scopeType: "segment" as const } : {})
    }),
    [scopeType, horizonDays]
  );

  const { result, loading, error, refresh } = usePredictions(cfg, queryOptions);
  const evalQuery = useMemo(
    () => ({
      limit: 15,
      ...(scopeType === "fleet" ? { scopeType: "fleet" as const, scopeKey: "fleet" } : {}),
      ...(scopeType === "segment" ? { scopeType: "segment" as const } : {})
    }),
    [scopeType]
  );
  const {
    result: evalResult,
    loading: evalLoading,
    refresh: refreshEvaluations
  } = usePredictionsEvaluations(cfg, evalQuery);
  const [forwardResult, setForwardResult] = useState<{ entries: ForwardAccuracyEntry[] } | undefined>();
  const [trendsResult, setTrendsResult] = useState<{ series: EvaluationTrendSeries[] } | undefined>();
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<ApiClientError | undefined>();

  const loadTrustPanels = useCallback(async () => {
    const [forward, trends] = await Promise.all([
      getPredictionsForwardAccuracy(cfg, { limit: 15 }),
      getPredictionsEvaluationTrends(cfg, { limit: 60 })
    ]);
    setForwardResult(forward);
    setTrendsResult(trends);
  }, [cfg]);

  useEffect(() => {
    void loadTrustPanels();
  }, [loadTrustPanels]);

  const scoreForecasts = useCallback(async () => {
    setScoring(true);
    setScoreError(undefined);
    try {
      await postPredictionsRefresh(cfg, { horizonDays, lookbackDays: 7 });
      await Promise.all([refresh(), refreshEvaluations(), loadTrustPanels()]);
    } catch (e) {
      setScoreError(
        e instanceof ApiClientError
          ? e
          : new ApiClientError("Request failed", { code: "UNKNOWN", requestId: "", status: 0 })
      );
    } finally {
      setScoring(false);
    }
  }, [cfg, horizonDays, refresh, refreshEvaluations, loadTrustPanels]);

  const bundles = result?.bundles ?? [];
  const busy = loading || scoring;
  const revenueBundles = bundles.filter((b) => b.metricKey === "revenue");

  return (
    <div>
      <PageHeader
        title="Predictions"
        subtitle="Cached champion forecasts (P10 / P50 / P90) with daily actuals. Enable WORKER_SCHEDULER_ENABLED for automatic refresh every 6h."
        actions={
          <div style={{ display: "flex", gap: "var(--fm-space-2)" }}>
            <button
              type="button"
              onClick={() => void scoreForecasts()}
              disabled={busy}
              style={{
                padding: "var(--fm-space-2) var(--fm-space-4)",
                borderRadius: "var(--fm-radius-sm)",
                border: "none",
                background: "var(--fm-color-accent)",
                color: "#fff",
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer"
              }}
            >
              {scoring ? "Scoring…" : "Score forecasts"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
              style={{
                padding: "var(--fm-space-2) var(--fm-space-4)",
                borderRadius: "var(--fm-radius-sm)",
                border: "1px solid var(--fm-color-border)",
                background: "var(--fm-color-surface-elevated)",
                color: "var(--fm-color-text)",
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer"
              }}
            >
              {loading ? "Loading…" : "Reload cache"}
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--fm-space-3)",
          marginBottom: "var(--fm-space-4)",
          alignItems: "center"
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "var(--fm-space-2)", fontSize: "0.9rem" }}>
          Scope
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as "fleet" | "segment" | "all")}
            style={{
              padding: "var(--fm-space-1) var(--fm-space-2)",
              borderRadius: "var(--fm-radius-sm)",
              border: "1px solid var(--fm-color-border)",
              background: "var(--fm-color-surface)",
              color: "var(--fm-color-text)"
            }}
          >
            <option value="all">All scopes</option>
            <option value="fleet">Fleet</option>
            <option value="segment">Segments</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--fm-space-2)", fontSize: "0.9rem" }}>
          Horizon (days)
          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            style={{
              padding: "var(--fm-space-1) var(--fm-space-2)",
              borderRadius: "var(--fm-radius-sm)",
              border: "1px solid var(--fm-color-border)",
              background: "var(--fm-color-surface)",
              color: "var(--fm-color-text)"
            }}
          >
            {[7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ?? scoreError ? (
        <p role="alert" style={{ color: "var(--fm-color-critical)", marginBottom: "var(--fm-space-3)" }}>
          {(scoreError ?? error)!.message} ({(scoreError ?? error)!.code})
        </p>
      ) : null}

      {!busy && bundles.length === 0 ? (
        <Card title="No cached predictions">
          <p style={{ color: "var(--fm-color-text-muted)", margin: "0 0 var(--fm-space-3)" }}>
            After Flespi backfill, click <strong>Score forecasts</strong> to train models and fill the cache
            (requires Postgres + migrations). The worker can also refresh on a schedule when Redis and{" "}
            <code>WORKER_SCHEDULER_ENABLED=true</code> are set.
          </p>
          <button
            type="button"
            onClick={() => void scoreForecasts()}
            disabled={busy}
            style={{
              padding: "var(--fm-space-2) var(--fm-space-4)",
              borderRadius: "var(--fm-radius-sm)",
              border: "none",
              background: "var(--fm-color-accent)",
              color: "#fff",
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer"
            }}
          >
            Score forecasts now
          </button>
        </Card>
      ) : null}

      {(forwardResult?.entries?.length ?? 0) > 0 ? (
        <section style={{ marginBottom: "var(--fm-space-5)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
            Forward accuracy (forecast vs realized)
          </h2>
          <Card title="Mature runs scored against actuals">
            <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--fm-color-text-muted)", textAlign: "left" }}>
                  <th style={{ padding: "var(--fm-space-1)" }}>Scope</th>
                  <th>Metric</th>
                  <th>Trained</th>
                  <th>MAPE</th>
                  <th>Days scored</th>
                  <th>Within band</th>
                </tr>
              </thead>
              <tbody>
                {forwardResult.entries.map((row: ForwardAccuracyEntry) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--fm-color-border)" }}>
                    <td style={{ padding: "var(--fm-space-1)" }}>
                      {row.scopeType === "fleet" ? "Fleet" : row.scopeKey}
                    </td>
                    <td>{METRIC_LABELS[row.metricKey] ?? row.metricKey}</td>
                    <td>{row.trainedUntil.slice(0, 10)}</td>
                    <td>{row.mapePct.toFixed(1)}%</td>
                    <td>{row.scoredDays}</td>
                    <td>{row.withinBandPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      ) : null}

      {(evalResult?.evaluations?.length ?? 0) > 0 ? (
        <section style={{ marginBottom: "var(--fm-space-5)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
            Model evaluation (holdout backtest)
          </h2>
          <Card title="Recent scoring runs">
            {evalLoading ? (
              <p style={{ color: "var(--fm-color-text-muted)", margin: 0 }}>Loading evaluations…</p>
            ) : (
              <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--fm-color-text-muted)", textAlign: "left" }}>
                    <th style={{ padding: "var(--fm-space-1)" }}>Scope</th>
                    <th>Metric</th>
                    <th>Model</th>
                    <th>MAPE</th>
                    <th>Within band</th>
                    <th>MAE</th>
                  </tr>
                </thead>
                <tbody>
                  {evalResult.evaluations.map((row: ForecastEvaluationEntry) => (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--fm-color-border)" }}>
                      <td style={{ padding: "var(--fm-space-1)" }}>
                        {row.scopeType === "fleet" ? "Fleet" : row.scopeKey}
                      </td>
                      <td>{METRIC_LABELS[row.metricKey] ?? row.metricKey}</td>
                      <td>{row.algorithm.replace(/_/g, " ")}</td>
                      <td>{row.mapePct.toFixed(1)}%</td>
                      <td>{row.withinBandPct.toFixed(0)}%</td>
                      <td>{row.mae.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>
      ) : null}

      {(trendsResult?.series?.length ?? 0) > 0 ? (
        <section style={{ marginBottom: "var(--fm-space-5)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
            MAPE trends
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--fm-space-3)" }}>
            {trendsResult.series.slice(0, 6).map((series) => {
              const last = series.points[series.points.length - 1];
              const first = series.points[0];
              const delta = last && first ? last.mapePct - first.mapePct : 0;
              return (
                <Card
                  key={`${series.scopeType}-${series.scopeKey}-${series.metricKey}-${series.evaluationKind}`}
                  title={`${series.scopeType === "fleet" ? "Fleet" : series.scopeKey} · ${METRIC_LABELS[series.metricKey] ?? series.metricKey} (${series.evaluationKind})`}
                >
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--fm-color-text-muted)" }}>
                    Latest MAPE <strong style={{ color: "var(--fm-color-text)" }}>{last?.mapePct.toFixed(1) ?? "—"}%</strong>
                    {series.points.length > 1 ? (
                      <span style={{ marginLeft: "var(--fm-space-2)" }}>
                        ({delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)} pts vs first)
                      </span>
                    ) : null}
                  </p>
                  <p style={{ margin: "var(--fm-space-2) 0 0", fontSize: "0.75rem", color: "var(--fm-color-text-muted)" }}>
                    {series.points.length} scoring event{series.points.length === 1 ? "" : "s"}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {revenueBundles.length > 0 ? (
        <section style={{ marginBottom: "var(--fm-space-5)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
            Revenue forecast
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--fm-space-4)" }}>
            {revenueBundles.map((bundle) => (
              <Card key={`${bundle.scopeType}-${bundle.scopeKey}-revenue`} title={scopeLabel(bundle)}>
                <ForecastBandChart
                  title={METRIC_LABELS[bundle.metricKey] ?? bundle.metricKey}
                  points={bundle.predictedPoints}
                  historyActuals={bundle.historyActuals}
                  trainedUntil={bundle.trainedUntil}
                />
                <ModelMeta bundle={bundle} />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {bundles.filter((b) => b.metricKey !== "revenue").length > 0 ? (
        <section>
          <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
            Other metrics
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--fm-space-4)" }}>
            {bundles
              .filter((b) => b.metricKey !== "revenue")
              .map((bundle) => (
                <Card
                  key={`${bundle.scopeType}-${bundle.scopeKey}-${bundle.metricKey}`}
                  title={`${scopeLabel(bundle)} · ${METRIC_LABELS[bundle.metricKey] ?? bundle.metricKey}`}
                >
                  <ForecastBandChart
                    title={METRIC_LABELS[bundle.metricKey] ?? bundle.metricKey}
                    points={bundle.predictedPoints}
                    historyActuals={bundle.historyActuals}
                    trainedUntil={bundle.trainedUntil}
                    height={200}
                  />
                  <ModelMeta bundle={bundle} />
                </Card>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ModelMeta({ bundle }: { bundle: PredictionBundle }): JSX.Element {
  const ex = bundle.explanation;
  return (
    <dl
      style={{
        margin: "var(--fm-space-3) 0 0",
        fontSize: "0.8rem",
        color: "var(--fm-color-text-muted)",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "var(--fm-space-1) var(--fm-space-3)"
      }}
    >
      <dt>Model</dt>
      <dd>{ex.algorithm.replace(/_/g, " ")}</dd>
      <dt>Sample days</dt>
      <dd>{ex.sampleSize}</dd>
      {ex.backtestMapePct !== undefined ? (
        <>
          <dt>Backtest MAPE</dt>
          <dd>{ex.backtestMapePct.toFixed(1)}%</dd>
        </>
      ) : null}
      {ex.championSelected ? (
        <>
          <dt>Champion</dt>
          <dd>Yes</dd>
        </>
      ) : null}
      {ex.candidates?.length ? (
        <>
          <dt>Candidates</dt>
          <dd>
            {ex.candidates.map((c) => `${c.algorithm.replace(/_/g, " ")} ${c.mapePct.toFixed(1)}%`).join(" · ")}
          </dd>
        </>
      ) : null}
      <dt>Trained until</dt>
      <dd>{bundle.trainedUntil.slice(0, 10)}</dd>
      <dt>Cached</dt>
      <dd>{bundle.cachedAt.slice(0, 19).replace("T", " ")} UTC</dd>
    </dl>
  );
}
