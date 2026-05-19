import type { CopilotResponse } from "@fleetmind/shared";
import { useCallback, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import { ApiClientError, postChatTurn } from "../api/client.js";

export interface UseChatTurnResult {
  sending: boolean;
  error: ApiClientError | undefined;
  send: (conversationId: string, question: string) => Promise<CopilotResponse | undefined>;
}

export function useChatTurn(cfg: ApiClientConfig): UseChatTurnResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiClientError | undefined>();

  const send = useCallback(
    async (conversationId: string, question: string) => {
      setSending(true);
      setError(undefined);
      try {
        const data = await postChatTurn(cfg, { conversationId, question });
        return data;
      } catch (e) {
        const next = e instanceof ApiClientError ? e : new ApiClientError("Request failed", { code: "UNKNOWN", requestId: "", status: 0 });
        setError(next);
        return undefined;
      } finally {
        setSending(false);
      }
    },
    [cfg]
  );

  return { sending, error, send };
}
