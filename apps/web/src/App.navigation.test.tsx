import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: unknown }) => {
    const Wrapper = "div" as const;
    return <Wrapper data-testid="map">{children as never}</Wrapper>;
  },
  TileLayer: () => null,
  CircleMarker: () => null,
  Marker: () => null,
  Tooltip: ({ children }: { children: unknown }) => <>{children as never}</>,
  Popup: ({ children }: { children: unknown }) => <>{children as never}</>,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    getZoom: () => 12,
    getCenter: () => ({ lat: 40.7, lng: -74 }),
    on: vi.fn(),
    off: vi.fn()
  })
}));

describe("App navigation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("/v1/fleet/locations")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { vehicleCount: 0, locatedCount: 0, vehicles: [] } })
          });
        }
        if (String(url).includes("/v1/predictions/evaluation-trends")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { tenantId: "tenant_test", series: [] } })
          });
        }
        if (String(url).includes("/v1/predictions/forward-accuracy")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { tenantId: "tenant_test", entries: [] } })
          });
        }
        if (String(url).includes("/v1/predictions/evaluations")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { tenantId: "tenant_test", evaluations: [] } })
          });
        }
        if (String(url).includes("/v1/analytics/mart-quality")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                tenantId: "tenant_test",
                lookbackDays: 30,
                window: { start: "2026-05-01T00:00:00.000Z", end: new Date().toISOString() },
                vehicleCount: 1,
                vehiclesWithMartRows: 1,
                vehiclesWithZeroDistance: 0,
                calendarDaysInWindow: 30,
                daysWithTripActivity: 20,
                coveragePct: 66,
                maxGapDays: 1,
                historyDaysAvailable: 20,
                minHistoryDaysRequired: 14,
                minCoveragePctRequired: 50,
                warnings: [],
                ok: true
              }
            })
          });
        }
        if (String(url).includes("/v1/predictions")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { tenantId: "tenant_test", horizonDays: 7, bundles: [], generatedAt: new Date().toISOString() }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              kpis: { tenantId: "tenant_test", fleetMetrics: [], vehicleMetrics: [] },
              forecasts: [],
              insights: []
            }
          })
        });
      })
    );
  });

  it("switches between chat, insights, and map from the shell nav", async () => {
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /fleet copilot/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^insights$/i }));

    expect(await screen.findByRole("heading", { name: /fleet insights/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^predictions$/i }));

    expect(await screen.findByRole("heading", { name: /^predictions$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^map$/i }));

    expect(await screen.findByRole("heading", { name: /fleet map/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^chat$/i }));

    expect(await screen.findByRole("heading", { name: /fleet copilot/i })).toBeTruthy();
  });
});
