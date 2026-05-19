import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Card({ title, children, style, className }) {
    return (_jsxs("section", { className: className, style: {
            background: "var(--fm-color-surface)",
            border: "1px solid var(--fm-color-border)",
            borderRadius: "var(--fm-radius-md)",
            padding: "var(--fm-space-4)",
            ...style
        }, children: [title ? (_jsx("h3", { style: {
                    margin: "0 0 var(--fm-space-3)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--fm-color-text)"
                }, children: title })) : null, children] }));
}
//# sourceMappingURL=Card.js.map