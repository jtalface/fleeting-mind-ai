import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function FleetMetricBars({ metrics, height = 220 }) {
    const data = metrics.map((m) => ({
        key: m.metricKey.replace(/_/g, " "),
        raw: m.value
    }));
    const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.raw)));
    return (_jsx("div", { style: { width: "100%", height }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { layout: "vertical", data: data, margin: { top: 4, right: 16, bottom: 4, left: 8 }, children: [_jsx(XAxis, { type: "number", domain: [0, maxAbs * 1.1], hide: true }), _jsx(YAxis, { type: "category", dataKey: "key", width: 120, tick: { fill: "var(--fm-color-text-muted)", fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(Tooltip, { contentStyle: {
                            background: "var(--fm-color-surface-elevated)",
                            border: "1px solid var(--fm-color-border)",
                            borderRadius: "var(--fm-radius-sm)",
                            color: "var(--fm-color-text)"
                        } }), _jsx(Bar, { dataKey: "raw", radius: [0, 4, 4, 0], children: data.map((_entry, i) => (_jsx(Cell, { fill: i % 2 === 0 ? "var(--fm-color-accent)" : "var(--fm-color-accent-muted)" }, i))) })] }) }) }));
}
//# sourceMappingURL=FleetMetricBars.js.map