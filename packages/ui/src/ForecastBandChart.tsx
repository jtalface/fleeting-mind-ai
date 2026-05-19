import type { ForecastPoint } from "@fleetmind/shared";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export interface ForecastBandChartProps {
  title: string;
  points: ForecastPoint[];
  height?: number;
}

export function ForecastBandChart({ title, points, height = 240 }: ForecastBandChartProps): JSX.Element {
  const data = points.map((p) => ({
    date: p.date.slice(5),
    value: p.value,
    upper: p.upperBound,
    lower: p.lowerBound
  }));

  const lineStyle = { strokeWidth: 2, dot: false };

  return (
    <div style={{ width: "100%", height }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--fm-color-text)", marginBottom: "var(--fm-space-2)" }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--fm-color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--fm-color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--fm-color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            contentStyle={{
              background: "var(--fm-color-surface-elevated)",
              border: "1px solid var(--fm-color-border)",
              borderRadius: "var(--fm-radius-sm)",
              color: "var(--fm-color-text)"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "var(--fm-color-text-muted)" }} />
          <Line name="Upper" type="monotone" dataKey="upper" stroke="var(--fm-color-text-muted)" strokeDasharray="4 4" {...lineStyle} />
          <Line name="Forecast" type="monotone" dataKey="value" stroke="var(--fm-color-accent)" {...lineStyle} />
          <Line name="Lower" type="monotone" dataKey="lower" stroke="var(--fm-color-text-muted)" strokeDasharray="4 4" {...lineStyle} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
