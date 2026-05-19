import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { InsightsPage } from "./InsightsPage.js";

describe("InsightsPage", () => {
  it("loads analytics KPIs from the API", async () => {
    const asOf = "2026-05-07T12:00:00.000Z";

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tenantId: "tenant_test",
          generatedAt: asOf,
          kpis: {
            tenantId: "tenant_test",
            generatedAt: asOf,
            timeframe: "custom",
            metricWindow: {
              start: "2026-05-01T00:00:00.000Z",
              end: asOf
            },
            fleetMetrics: [
              {
                metricKey: "profit",
                value: 12500,
                unit: "currency",
                timeframe: "custom",
                asOf
              }
            ],
            vehicleMetrics: []
          },
          insights: [],
          forecasts: []
        }
      })
    });

    render(
      <MemoryRouter>
        <InsightsPage
          cfg={{
            baseUrl: "",
            tenantId: "tenant_test",
            userId: "user_test",
            fetchImpl
          }}
        />
      </MemoryRouter>
    );

    expect(await screen.findByText(/\$12,500|12,?500/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^refresh$/i }));

    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
