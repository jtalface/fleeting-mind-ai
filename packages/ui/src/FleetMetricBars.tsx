import type { MetricValue } from "@fleetmind/shared";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface FleetMetricBarsProps {
  metrics: MetricValue[];
  height?: number;
}

export function FleetMetricBars({ metrics, height = 220 }: FleetMetricBarsProps): JSX.Element {
  const data = metrics.map((m) => ({
    key: m.metricKey.replace(/_/g, " "),
    raw: m.value
  }));

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.raw)));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <XAxis type="number" domain={[0, maxAbs * 1.1]} hide />
          <YAxis
            type="category"
            dataKey="key"
            width={120}
            tick={{ fill: "var(--fm-color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--fm-color-surface-elevated)",
              border: "1px solid var(--fm-color-border)",
              borderRadius: "var(--fm-radius-sm)",
              color: "var(--fm-color-text)"
            }}
          />
          <Bar dataKey="raw" radius={[0, 4, 4, 0]}>
            {data.map((_entry, i) => (
              <Cell key={i} fill={i % 2 === 0 ? "var(--fm-color-accent)" : "var(--fm-color-accent-muted)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
