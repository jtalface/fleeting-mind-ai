import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage", () => {
  it("posts a question and renders the assistant answer", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () =>
        ({
          data: {
            answer: "Profitability is trending flat over the selected window.",
            recommendations: ["Check idle-heavy routes"],
            citedFacts: [
              {
                claim: "Profit margin held steady",
                toolName: "get_profitability_summary",
                citation: "repo_fixture:v1"
              }
            ],
            confidence: 0.81,
            needsFollowUp: true
          }
        }) as const
    });

    render(
      <MemoryRouter>
        <ChatPage
          cfg={{
            baseUrl: "",
            tenantId: "tenant_test",
            userId: "user_test",
            fetchImpl
          }}
        />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByRole("textbox", { name: /chat message/i }), {
      target: { value: "How is profitability?" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByText(/Profitability is trending flat/i)).toBeTruthy();

    expect(fetchImpl).toHaveBeenCalledWith(
      "/v1/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-tenant-id": "tenant_test",
          "x-user-id": "user_test"
        }) as HeadersInit
      })
    );
  });
});
