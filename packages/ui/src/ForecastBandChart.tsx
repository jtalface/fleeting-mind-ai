import type { ForecastPoint } from "@fleetmind/shared";
import type { PredictionHistoryPoint } from "@fleetmind/shared/contracts/predictions.js";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export interface ForecastBandChartProps {
  title: string;
  points: ForecastPoint[];
  historyActuals?: PredictionHistoryPoint[];
  trainedUntil?: string;
  height?: number;
}

export function ForecastBandChart({
  title,
  points,
  historyActuals = [],
  trainedUntil,
  height = 240
}: ForecastBandChartProps): JSX.Element {
  const byDate = new Map<string, { date: string; actual?: number; value?: number; upper?: number; lower?: number }>();

  for (const row of historyActuals) {
    byDate.set(row.date.slice(5), { date: row.date.slice(5), actual: row.actual });
  }
  for (const p of points) {
    const key = p.date.slice(5);
    const existing = byDate.get(key) ?? { date: key };
    byDate.set(key, {
      ...existing,
      value: p.value,
      upper: p.upperBound,
      lower: p.lowerBound
    });
  }

  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const trainedLabel = trainedUntil?.slice(5);

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
          {trainedLabel ? (
            <ReferenceLine
              x={trainedLabel}
              stroke="var(--fm-color-warning)"
              strokeDasharray="3 3"
              label={{ value: "trained", position: "insideTopRight", fill: "var(--fm-color-text-muted)", fontSize: 10 }}
            />
          ) : null}
          {historyActuals.length > 0 ? (
            <Line
              name="Actual"
              type="monotone"
              dataKey="actual"
              stroke="var(--fm-color-success)"
              connectNulls
              {...lineStyle}
            />
          ) : null}
          <Line name="P90" type="monotone" dataKey="upper" stroke="var(--fm-color-text-muted)" strokeDasharray="4 4" connectNulls {...lineStyle} />
          <Line name="P50" type="monotone" dataKey="value" stroke="var(--fm-color-accent)" connectNulls {...lineStyle} />
          <Line name="P10" type="monotone" dataKey="lower" stroke="var(--fm-color-text-muted)" strokeDasharray="4 4" connectNulls {...lineStyle} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
