import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const severityColor = {
    info: "var(--fm-color-accent)",
    warning: "var(--fm-color-warning)",
    critical: "var(--fm-color-critical)"
};
export function InsightCard({ insight }) {
    return (_jsxs("article", { style: {
            padding: "var(--fm-space-3)",
            borderLeft: `4px solid ${severityColor[insight.severity]}`,
            background: "var(--fm-color-surface-elevated)",
            borderRadius: "var(--fm-radius-sm)",
            marginBottom: "var(--fm-space-3)"
        }, children: [_jsxs("header", { style: { display: "flex", gap: "var(--fm-space-2)", alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("h4", { style: { margin: 0, fontSize: "0.95rem", color: "var(--fm-color-text)" }, children: insight.title }), _jsxs("span", { style: { fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fm-color-text-muted)" }, children: [insight.severity, " \u00B7 ", insight.entityType] })] }), _jsx("p", { style: { margin: "var(--fm-space-2) 0", fontSize: "0.85rem", color: "var(--fm-color-text-muted)", lineHeight: 1.5 }, children: insight.description }), _jsxs("p", { style: { margin: 0, fontSize: "0.85rem", color: "var(--fm-color-success)" }, children: [_jsx("strong", { style: { color: "var(--fm-color-text-muted)" }, children: "Recommendation:" }), " ", insight.recommendation] })] }));
}
//# sourceMappingURL=InsightCard.js.map