import { describe, expect, it } from "vitest";
import {
  clusterFleetLocationsForZoom,
  clusterSharesExactGps,
  collapsedClusterCount,
  outlierCount,
  positionsForMapBounds,
  vehiclesInCollapsedClusters
} from "./fleet-map-geo.js";

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
});

describe("clusterFleetLocationsForZoom", () => {
  const nearby = [
    { vehicleId: "a", plateNumber: "A", latitude: 32.703, longitude: -114.621 },
    { vehicleId: "b", plateNumber: "B", latitude: 32.7031, longitude: -114.6211 },
    { vehicleId: "c", plateNumber: "C", latitude: 32.7032, longitude: -114.6212 }
  ];

  it("groups nearby vehicles when zoomed out", () => {
    const clusters = clusterFleetLocationsForZoom(nearby, 11, 32.703);

    expect(collapsedClusterCount(clusters)).toBeGreaterThan(0);
    expect(vehiclesInCollapsedClusters(clusters)).toBe(3);
  });

  it("separates vehicles that are far enough apart at high zoom", () => {
    const separated = [
      { vehicleId: "a", latitude: 32.703, longitude: -114.621 },
      { vehicleId: "b", latitude: 32.705, longitude: -114.621 },
      { vehicleId: "c", latitude: 32.703, longitude: -114.618 }
    ];
    const clusters = clusterFleetLocationsForZoom(separated, 15, 32.703);

    expect(clusters).toHaveLength(3);
    expect(clusters.every((cluster) => !cluster.collapsed)).toBe(true);
  });

  it("detects when grouped vehicles share the exact same GPS fix", () => {
    const sameFix = [
      { vehicleId: "a", latitude: 1, longitude: 2 },
      { vehicleId: "b", latitude: 1, longitude: 2 }
    ];

    expect(clusterSharesExactGps(sameFix)).toBe(true);

    const clusters = clusterFleetLocationsForZoom(sameFix, 15, 1);
    expect(clusters[0]!.sameGpsFix).toBe(true);
  });
});
