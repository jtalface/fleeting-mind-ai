import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function ForecastBandChart({ title, points, height = 240 }) {
    const data = points.map((p) => ({
        date: p.date.slice(5),
        value: p.value,
        upper: p.upperBound,
        lower: p.lowerBound
    }));
    const lineStyle = { strokeWidth: 2, dot: false };
    return (_jsxs("div", { style: { width: "100%", height }, children: [_jsx("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "var(--fm-color-text)", marginBottom: "var(--fm-space-2)" }, children: title }), _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(ComposedChart, { data: data, margin: { top: 8, right: 8, bottom: 4, left: 0 }, children: [_jsx(CartesianGrid, { stroke: "var(--fm-color-border)", strokeDasharray: "3 3", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fill: "var(--fm-color-text-muted)", fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: "var(--fm-color-text-muted)", fontSize: 11 }, axisLine: false, tickLine: false, width: 44 }), _jsx(Tooltip, { contentStyle: {
                                background: "var(--fm-color-surface-elevated)",
                                border: "1px solid var(--fm-color-border)",
                                borderRadius: "var(--fm-radius-sm)",
                                color: "var(--fm-color-text)"
                            } }), _jsx(Legend, { wrapperStyle: { fontSize: "11px", color: "var(--fm-color-text-muted)" } }), _jsx(Line, { name: "Upper", type: "monotone", dataKey: "upper", stroke: "var(--fm-color-text-muted)", strokeDasharray: "4 4", ...lineStyle }), _jsx(Line, { name: "Forecast", type: "monotone", dataKey: "value", stroke: "var(--fm-color-accent)", ...lineStyle }), _jsx(Line, { name: "Lower", type: "monotone", dataKey: "lower", stroke: "var(--fm-color-text-muted)", strokeDasharray: "4 4", ...lineStyle })] }) })] }));
}
//# sourceMappingURL=ForecastBandChart.js.map