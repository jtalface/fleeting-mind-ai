import { KPI_FORECAST_NOTE } from "@fleetmind/shared";

export function FinanceMetricsCallout(): JSX.Element {
  return (
    <aside
      role="note"
      style={{
        marginBottom: "var(--fm-space-4)",
        padding: "var(--fm-space-3) var(--fm-space-4)",
        borderRadius: "var(--fm-radius-sm)",
        border: "1px solid var(--fm-color-border)",
        background: "var(--fm-color-surface-elevated)",
        color: "var(--fm-color-text-muted)",
        fontSize: "0.875rem",
        lineHeight: 1.5
      }}
    >
      <strong style={{ color: "var(--fm-color-text)", display: "block", marginBottom: "var(--fm-space-1)" }}>
        KPIs vs forecasts
      </strong>
      {KPI_FORECAST_NOTE}{" "}
      <a href="/settings" style={{ color: "var(--fm-color-accent)" }}>
        Finance settings
      </a>{" "}
      to edit rate cards or activate a billing contract.
    </aside>
  );
}
