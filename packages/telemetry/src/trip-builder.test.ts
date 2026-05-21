import { describe, expect, it } from "vitest";
import type { TelemetryPoint } from "@fleetmind/shared/contracts/domain.js";
import { buildTripsFromTelemetry } from "./trip-builder.js";

const point = (overrides: Partial<TelemetryPoint>): TelemetryPoint => ({
  tenantId: "tenant_a",
  vehicleId: "vehicle_1",
  timestamp: "2026-05-07T10:00:00.000Z",
  latitude: 37.7749,
  longitude: -122.4194,
  source: "device",
  ...overrides
});

describe("buildTripsFromTelemetry", () => {
  it("builds a trip from sorted points when input is out-of-order", () => {
    const trips = buildTripsFromTelemetry([
      point({
        timestamp: "2026-05-07T10:10:00.000Z",
        speedKph: 45,
        ignitionOn: true,
        odometerKm: 2010
      }),
      point({
        timestamp: "2026-05-07T10:00:00.000Z",
        speedKph: 20,
        ignitionOn: true,
        odometerKm: 2000
      }),
      point({
        timestamp: "2026-05-07T10:15:00.000Z",
        speedKph: 0,
        ignitionOn: false,
        odometerKm: 2011
      })
    ]);

    expect(trips).toHaveLength(1);
    expect(trips[0]?.startTime).toBe("2026-05-07T10:00:00.000Z");
    expect(trips[0]?.endTime).toBe("2026-05-07T10:10:00.000Z");
    expect(trips[0]?.distanceKm).toBe(10);
  });

  it("builds trips from GPS-only points without speed or ignition (Flespi-style)", () => {
    const trips = buildTripsFromTelemetry([
      point({
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 32.7,
        longitude: -114.62
      }),
      point({
        timestamp: "2026-05-07T10:05:00.000Z",
        latitude: 32.71,
        longitude: -114.61
      }),
      point({
        timestamp: "2026-05-07T10:10:00.000Z",
        latitude: 32.72,
        longitude: -114.6
      })
    ]);

    expect(trips).toHaveLength(1);
    expect(trips[0]?.distanceKm).toBeGreaterThan(0.05);
    expect(trips[0]?.startTime).toBe("2026-05-07T10:00:00.000Z");
    expect(trips[0]?.endTime).toBe("2026-05-07T10:10:00.000Z");
  });

  it("drops GPS-only segments with negligible movement (parked jitter)", () => {
    const trips = buildTripsFromTelemetry([
      point({
        timestamp: "2026-05-07T10:00:00.000Z",
        latitude: 32.7,
        longitude: -114.62
      }),
      point({
        timestamp: "2026-05-07T10:05:00.000Z",
        latitude: 32.70001,
        longitude: -114.62001
      }),
      point({
        timestamp: "2026-05-07T10:10:00.000Z",
        latitude: 32.70002,
        longitude: -114.62002
      })
    ]);

    expect(trips).toHaveLength(0);
  });
});
