export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps): JSX.Element {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "var(--fm-space-3)"
      }}
    >
      <div
        style={{
          maxWidth: "min(720px, 92%)",
          padding: "var(--fm-space-3) var(--fm-space-4)",
          borderRadius: "var(--fm-radius-md)",
          background: isUser ? "var(--fm-color-accent-muted)" : "var(--fm-color-surface-elevated)",
          color: "var(--fm-color-text)",
          border: isUser ? "none" : "1px solid var(--fm-color-border)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.55,
          fontSize: "0.9rem"
        }}
      >
        {content}
      </div>
    </div>
  );
}
