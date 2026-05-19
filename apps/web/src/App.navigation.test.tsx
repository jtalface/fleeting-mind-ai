import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App navigation", () => {
  it("switches between chat and insights from the shell nav", async () => {
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /fleet copilot/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^insights$/i }));

    expect(await screen.findByRole("heading", { name: /fleet insights/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^chat$/i }));

    expect(await screen.findByRole("heading", { name: /fleet copilot/i })).toBeTruthy();
  });
});
