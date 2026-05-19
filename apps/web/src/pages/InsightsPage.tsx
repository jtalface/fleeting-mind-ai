import type { DeterministicForecast, Insight, MetricValue } from "@fleetmind/shared";
import { Card, FleetMetricBars, ForecastBandChart, InsightCard, KpiStat, PageHeader } from "@fleetmind/ui";
import { useMemo } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { useAnalyticsReport } from "../hooks/useAnalyticsReport.js";

function rollingWeekWindow(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export interface InsightsPageProps {
  cfg: ApiClientConfig;
}

export function InsightsPage({ cfg }: InsightsPageProps): JSX.Element {
  const { start, end } = useMemo(() => rollingWeekWindow(), []);
  const { report, loading, error, refresh } = useAnalyticsReport(cfg, start, end, 7);

  const fleetMetrics = report?.kpis.fleetMetrics ?? [];

  return (
    <div>
      <PageHeader
        title="Fleet insights"
        subtitle="KPIs, deterministic forecasts, and rule-based insights from `/v1/analytics/query`."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            style={{
              padding: "var(--fm-space-2) var(--fm-space-4)",
              borderRadius: "var(--fm-radius-sm)",
              border: "1px solid var(--fm-color-border)",
              background: "var(--fm-color-surface-elevated)",
              color: "var(--fm-color-text)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      />

      {error ? (
        <p role="alert" style={{ color: "var(--fm-color-critical)", marginBottom: "var(--fm-space-3)" }}>
          {error.message} ({error.code})
        </p>
      ) : null}

      <section style={{ marginBottom: "var(--fm-space-5)" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>Fleet KPIs</h2>
        {fleetMetrics.length === 0 && !loading ? (
          <p style={{ color: "var(--fm-color-text-muted)" }}>No KPI rows yet — verify analytics data or API fixtures.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fm-space-3)" }}>
            {fleetMetrics.map((m: MetricValue) => (
              <KpiStat key={m.metricKey + m.asOf} metric={m} />
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--fm-space-4)" }}>
        <Card title="Metric comparison">
          {fleetMetrics.length > 0 ? <FleetMetricBars metrics={fleetMetrics} /> : <p style={{ color: "var(--fm-color-text-muted)" }}>—</p>}
        </Card>

        <Card title="Forecasts">
          {report?.forecasts?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fm-space-5)" }}>
              {report.forecasts.map((f: DeterministicForecast) => (
                <ForecastBandChart key={f.metricKey + f.trainedUntil} title={f.metricKey.replace(/_/g, " ")} points={f.predictedPoints} />
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--fm-color-text-muted)", margin: 0 }}>No forecast series returned for this window.</p>
          )}
        </Card>
      </div>

      <section style={{ marginTop: "var(--fm-space-5)" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>Insights</h2>
        {report?.insights?.length ? (
          report.insights.map((insight: Insight) => <InsightCard key={insight.id} insight={insight} />)
        ) : (
          <p style={{ color: "var(--fm-color-text-muted)" }}>No insights for this window.</p>
        )}
      </section>
    </div>
  );
}
