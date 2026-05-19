import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageHeader({ title, subtitle, actions }) {
    return (_jsxs("header", { style: {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--fm-space-4)",
            marginBottom: "var(--fm-space-5)"
        }, children: [_jsxs("div", { children: [_jsx("h1", { style: {
                            margin: 0,
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "var(--fm-color-text)",
                            letterSpacing: "-0.02em"
                        }, children: title }), subtitle ? (_jsx("p", { style: { margin: "var(--fm-space-2) 0 0", color: "var(--fm-color-text-muted)", maxWidth: "52ch" }, children: subtitle })) : null] }), actions ? _jsx("div", { style: { display: "flex", gap: "var(--fm-space-2)", alignItems: "center" }, children: actions }) : null] }));
}
//# sourceMappingURL=PageHeader.js.map