import type { CopilotResponse } from "@fleetmind/shared";
import { ChatComposer, ChatMessage, PageHeader } from "@fleetmind/ui";
import { useCallback, useMemo, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { useChatTurn } from "../hooks/useChatTurn.js";

function formatAssistantMessage(response: CopilotResponse): string {
  let text = response.answer;
  if (response.recommendations.length > 0) {
    text += "\n\nRecommendations:\n";
    text += response.recommendations.map((r: string) => `• ${r}`).join("\n");
  }
  if (response.citedFacts.length > 0) {
    text += "\n\nCited facts:\n";
    text += response.citedFacts.map((c: CopilotResponse["citedFacts"][number]) => `• ${c.claim} (${c.toolName}: ${c.citation})`).join("\n");
  }
  text += `\n\nConfidence: ${(response.confidence * 100).toFixed(0)}%`;
  if (response.needsFollowUp) {
    text += "\nFollow-up suggested.";
  }
  return text;
}

function readConversationId(): string {
  const key = "fleetmind_conversation_id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return "conv_local_fallback";
  }
}

export interface ChatPageProps {
  cfg: ApiClientConfig;
}

export function ChatPage({ cfg }: ChatPageProps): JSX.Element {
  const conversationId = useMemo(() => readConversationId(), []);
  const { sending, error, send } = useChatTurn(cfg);

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Ask about your fleet, sweepers, idle time, insights, or profitability. Answers use live data from Postgres (and OpenAI narration when OPENAI_API_KEY is set)."
    }
  ]);

  const onSend = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      const response = await send(conversationId, text);
      if (response) {
        setMessages((prev) => [...prev, { role: "assistant", content: formatAssistantMessage(response) }]);
      }
    },
    [conversationId, send]
  );

  return (
    <div>
      <PageHeader
        title="Fleet copilot"
        subtitle="Grounded chat turns use tenant headers and `/v1/chat`. Run the API locally or set VITE_API_BASE_URL."
      />

      {error ? (
        <p role="alert" style={{ color: "var(--fm-color-critical)", marginBottom: "var(--fm-space-3)" }}>
          {error.message} ({error.code}) — request {error.requestId || "n/a"}
        </p>
      ) : null}

      <div
        style={{
          border: "1px solid var(--fm-color-border)",
          borderRadius: "var(--fm-radius-md)",
          padding: "var(--fm-space-4)",
          background: "var(--fm-color-surface)",
          minHeight: "420px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "var(--fm-space-3)" }}>
          {messages.map((m, i) => (
            <ChatMessage key={`${m.role}-${i}`} role={m.role} content={m.content} />
          ))}
        </div>
        <ChatComposer onSend={(text: string) => void onSend(text)} disabled={sending} />
      </div>
    </div>
  );
}
