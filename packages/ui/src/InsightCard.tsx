import type { Insight } from "@fleetmind/shared";

const severityColor: Record<Insight["severity"], string> = {
  info: "var(--fm-color-accent)",
  warning: "var(--fm-color-warning)",
  critical: "var(--fm-color-critical)"
};

export interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps): JSX.Element {
  return (
    <article
      style={{
        padding: "var(--fm-space-3)",
        borderLeft: `4px solid ${severityColor[insight.severity]}`,
        background: "var(--fm-color-surface-elevated)",
        borderRadius: "var(--fm-radius-sm)",
        marginBottom: "var(--fm-space-3)"
      }}
    >
      <header style={{ display: "flex", gap: "var(--fm-space-2)", alignItems: "baseline", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--fm-color-text)" }}>{insight.title}</h4>
        <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fm-color-text-muted)" }}>
          {insight.severity} · {insight.entityType}
        </span>
      </header>
      <p style={{ margin: "var(--fm-space-2) 0", fontSize: "0.85rem", color: "var(--fm-color-text-muted)", lineHeight: 1.5 }}>
        {insight.description}
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--fm-color-success)" }}>
        <strong style={{ color: "var(--fm-color-text-muted)" }}>Recommendation:</strong> {insight.recommendation}
      </p>
    </article>
  );
}
