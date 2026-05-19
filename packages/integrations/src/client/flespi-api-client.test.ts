import { afterEach, describe, expect, it, vi } from "vitest";
import { FlespiApiClient } from "./flespi-api-client.js";

describe("FlespiApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps devices from flespi /gw/devices/all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: [
            {
              id: 6546042,
              name: "Sweeper 7301",
              configuration: { ident: "41028666" }
            }
          ]
        })
      })
    );

    const client = new FlespiApiClient({ token: "test-token", timeoutMs: 5000, messagesPageSize: 100 });
    const vehicles = await client.listVehicles();

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.id).toBe("6546042");
    expect(vehicles[0]?.vin).toBe("41028666");
    expect(vehicles[0]?.vehicleClass).toBe("truck");
  });

  it("maps messages into telemetry points", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: [
            {
              timestamp: 1779220800,
              "position.latitude": 32.7,
              "position.longitude": -114.62,
              "position.speed": 45,
              "vehicle.mileage": 3226.2
            }
          ]
        })
      })
    );

    const client = new FlespiApiClient({ token: "test-token", timeoutMs: 5000, messagesPageSize: 100 });
    const page = await client.fetchTelemetryPage("6546042");

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.speedKph).toBe(45);
    expect(page.items[0]?.odometerKm).toBe(3226.2);
  });
});
