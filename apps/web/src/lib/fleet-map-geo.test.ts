import { describe, expect, it } from "vitest";
import { outlierCount, positionsForMapBounds, spreadOverlappingMarkers } from "./fleet-map-geo.js";

describe("positionsForMapBounds", () => {
  it("excludes a single distant outlier from auto-zoom", () => {
    const arizona: [number, number][] = [
      [32.7, -114.62],
      [32.701, -114.621],
      [32.702, -114.619]
    ];
    const saoPaulo: [number, number] = [-23.55, -46.63];
    const bounds = positionsForMapBounds([...arizona, saoPaulo]);

    expect(bounds).toHaveLength(3);
    expect(bounds.every((p) => p[0] > 0)).toBe(true);
    expect(outlierCount([...arizona, saoPaulo])).toBe(1);
  });

  it("keeps all positions when fleet is geographically cohesive", () => {
    const positions: [number, number][] = [
      [32.7, -114.62],
      [32.71, -114.63],
      [32.69, -114.61]
    ];
    expect(positionsForMapBounds(positions)).toHaveLength(3);
    expect(outlierCount(positions)).toBe(0);
  });
});

describe("spreadOverlappingMarkers", () => {
  it("offsets vehicles that share identical coordinates", () => {
    const spread = spreadOverlappingMarkers([
      { vehicleId: "a", latitude: 1, longitude: 2 },
      { vehicleId: "b", latitude: 1, longitude: 2 }
    ]);

    expect(spread).toHaveLength(2);
    expect(spread[0]!.displayLatitude).toBe(spread[1]!.displayLatitude);
    expect(spread[0]!.displayLongitude).not.toBe(spread[1]!.displayLongitude);
  });
});
