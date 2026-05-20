import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FleetMapPage } from "./FleetMapPage.js";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => {
    const Wrapper = "div" as const;
    return <Wrapper data-testid="map">{children}</Wrapper>;
  },
  TileLayer: () => null,
  CircleMarker: () => null,
  Marker: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  Popup: ({ children }: { children: ReactNode }) => <>{children}</>,
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

const cfg = {
  baseUrl: "",
  tenantId: "tenant_test",
  userId: "user_test"
};

describe("FleetMapPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            vehicleCount: 2,
            locatedCount: 1,
            vehicles: [
              {
                vehicleId: "v1",
                plateNumber: "Sweeper 101",
                latitude: 40.7,
                longitude: -74.0,
                timestamp: "2026-05-01T12:00:00.000Z",
                speedKph: 0,
                status: "idle"
              }
            ]
          }
        })
      })
    );
  });

  it("loads fleet locations and shows summary", async () => {
    render(
      <MemoryRouter>
        <FleetMapPage cfg={cfg} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /fleet map/i })).toBeTruthy();
    expect(screen.getByText(/vehicles total/i)).toBeTruthy();
    expect(screen.getByTestId("map")).toBeTruthy();
  });
});
