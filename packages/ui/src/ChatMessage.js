import { jsx as _jsx } from "react/jsx-runtime";
export function ChatMessage({ role, content }) {
    const isUser = role === "user";
    return (_jsx("div", { style: {
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            marginBottom: "var(--fm-space-3)"
        }, children: _jsx("div", { style: {
                maxWidth: "min(720px, 92%)",
                padding: "var(--fm-space-3) var(--fm-space-4)",
                borderRadius: "var(--fm-radius-md)",
                background: isUser ? "var(--fm-color-accent-muted)" : "var(--fm-color-surface-elevated)",
                color: "var(--fm-color-text)",
                border: isUser ? "none" : "1px solid var(--fm-color-border)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: "0.9rem"
            }, children: content }) }));
}
//# sourceMappingURL=ChatMessage.js.map