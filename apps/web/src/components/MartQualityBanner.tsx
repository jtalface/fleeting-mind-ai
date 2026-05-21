import type { MartQualityReport } from "@fleetmind/shared";

export interface MartQualityBannerProps {
  report: MartQualityReport | undefined;
  loading?: boolean;
  error?: string;
}

export function MartQualityBanner({ report, loading, error }: MartQualityBannerProps): JSX.Element | null {
  if (loading) {
    return (
      <aside
        role="status"
        style={{
          marginBottom: "var(--fm-space-4)",
          padding: "var(--fm-space-3) var(--fm-space-4)",
          borderRadius: "var(--fm-radius-sm)",
          border: "1px solid var(--fm-color-border)",
          background: "var(--fm-color-surface-elevated)",
          color: "var(--fm-color-text-muted)",
          fontSize: "0.875rem"
        }}
      >
        Checking fleet data quality…
      </aside>
    );
  }

  if (error) {
    return (
      <aside
        role="alert"
        style={{
          marginBottom: "var(--fm-space-4)",
          padding: "var(--fm-space-3) var(--fm-space-4)",
          borderRadius: "var(--fm-radius-sm)",
          border: "1px solid var(--fm-color-critical)",
          background: "color-mix(in srgb, var(--fm-color-critical) 12%, transparent)",
          color: "var(--fm-color-critical)",
          fontSize: "0.875rem"
        }}
      >
        Could not load data quality: {error}
      </aside>
    );
  }

  if (!report || report.ok) {
    return null;
  }

  return (
    <aside
      role="alert"
      style={{
        marginBottom: "var(--fm-space-4)",
        padding: "var(--fm-space-3) var(--fm-space-4)",
        borderRadius: "var(--fm-radius-sm)",
        border: "1px solid color-mix(in srgb, var(--fm-color-warning, #c9a227) 55%, var(--fm-color-border))",
        background: "color-mix(in srgb, var(--fm-color-warning, #c9a227) 10%, var(--fm-color-surface-elevated))",
        color: "var(--fm-color-text)",
        fontSize: "0.875rem",
        lineHeight: 1.5
      }}
    >
      <strong style={{ display: "block", marginBottom: "var(--fm-space-2)" }}>Fleet data quality</strong>
      <p style={{ margin: "0 0 var(--fm-space-2)", color: "var(--fm-color-text-muted)" }}>
        {report.daysWithTripActivity} active days / {report.calendarDaysInWindow} calendar days ({report.coveragePct}%
        coverage) over {report.lookbackDays}d — forecasts may be unreliable until backfill improves history.
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {(report.warnings ?? []).map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </aside>
  );
}
