import type { MetricValue } from "@fleetmind/shared";

const unitLabel: Record<MetricValue["unit"], string> = {
  currency: "",
  percent: "%",
  ratio: "",
  distance: " km",
  duration: "",
  count: ""
};

function formatValue(metric: MetricValue): string {
  const suffix = unitLabel[metric.unit];
  if (metric.unit === "currency") {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      metric.value
    );
  }
  if (metric.unit === "percent" || metric.metricKey.includes("pct")) {
    return `${metric.value.toFixed(1)}${suffix}`;
  }
  return `${metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export interface KpiStatProps {
  metric: MetricValue;
}

export function KpiStat({ metric }: KpiStatProps): JSX.Element {
  const label = metric.metricKey.replace(/_/g, " ");

  return (
    <div
      style={{
        minWidth: "140px",
        padding: "var(--fm-space-3)",
        background: "var(--fm-color-surface-elevated)",
        borderRadius: "var(--fm-radius-sm)",
        border: "1px solid var(--fm-color-border)"
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "var(--fm-color-text-muted)", textTransform: "capitalize" }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--fm-color-text)", marginTop: "var(--fm-space-1)" }}>
        {formatValue(metric)}
      </div>
    </div>
  );
}
