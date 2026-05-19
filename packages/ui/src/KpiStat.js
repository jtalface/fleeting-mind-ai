import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const unitLabel = {
    currency: "",
    percent: "%",
    ratio: "",
    distance: " km",
    duration: "",
    count: ""
};
function formatValue(metric) {
    const suffix = unitLabel[metric.unit];
    if (metric.unit === "currency") {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metric.value);
    }
    if (metric.unit === "percent" || metric.metricKey.includes("pct")) {
        return `${metric.value.toFixed(1)}${suffix}`;
    }
    return `${metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}
export function KpiStat({ metric }) {
    const label = metric.metricKey.replace(/_/g, " ");
    return (_jsxs("div", { style: {
            minWidth: "140px",
            padding: "var(--fm-space-3)",
            background: "var(--fm-color-surface-elevated)",
            borderRadius: "var(--fm-radius-sm)",
            border: "1px solid var(--fm-color-border)"
        }, children: [_jsx("div", { style: { fontSize: "0.75rem", color: "var(--fm-color-text-muted)", textTransform: "capitalize" }, children: label }), _jsx("div", { style: { fontSize: "1.35rem", fontWeight: 700, color: "var(--fm-color-text)", marginTop: "var(--fm-space-1)" }, children: formatValue(metric) })] }));
}
//# sourceMappingURL=KpiStat.js.map