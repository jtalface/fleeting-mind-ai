import type { FormEvent } from "react";
import { useState } from "react";

export interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, disabled, placeholder = "Ask about fleet performance…" }: ChatComposerProps): JSX.Element {
  const [value, setValue] = useState("");

  function submit(e: FormEvent): void {
    e.preventDefault();
    const next = value.trim();
    if (!next || disabled) return;
    onSend(next);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        gap: "var(--fm-space-2)",
        alignItems: "stretch",
        paddingTop: "var(--fm-space-3)",
        borderTop: "1px solid var(--fm-color-border)"
      }}
    >
      <textarea
        aria-label="Chat message"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        onChange={(ev) => setValue(ev.target.value)}
        style={{
          flex: 1,
          resize: "vertical",
          minHeight: "44px",
          padding: "var(--fm-space-3)",
          borderRadius: "var(--fm-radius-sm)",
          border: "1px solid var(--fm-color-border)",
          background: "var(--fm-color-bg)",
          color: "var(--fm-color-text)",
          fontFamily: "inherit",
          fontSize: "0.9rem"
        }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        style={{
          alignSelf: "flex-end",
          padding: "0 var(--fm-space-4)",
          minHeight: "44px",
          borderRadius: "var(--fm-radius-sm)",
          border: "none",
          background: "var(--fm-color-accent)",
          color: "#fff",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled || !value.trim() ? 0.5 : 1
        }}
      >
        Send
      </button>
    </form>
  );
}
