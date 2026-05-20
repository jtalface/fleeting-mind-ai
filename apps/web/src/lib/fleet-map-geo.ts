/** Earth radius in meters (WGS84 mean). */
const EARTH_RADIUS_M = 6_371_000;

export type LatLng = [latitude: number, longitude: number];

export function haversineMeters(a: LatLng, b: LatLng): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Positions used for map auto-zoom. Drops geographic outliers so a single
 * distant vehicle (e.g. seed/demo data) does not collapse the main fleet.
 */
export function positionsForMapBounds(positions: LatLng[]): LatLng[] {
  if (positions.length <= 2) {
    return positions;
  }

  const center: LatLng = [median(positions.map((p) => p[0])), median(positions.map((p) => p[1]))];
  const distances = positions.map((p) => haversineMeters(p, center));
  const medianDistance = median(distances);
  const cutoffMeters = Math.max(medianDistance * 4, 75_000);

  const inCluster = positions.filter((_, i) => distances[i]! <= cutoffMeters);
  return inCluster.length >= 2 ? inCluster : positions;
}

export function outlierCount(positions: LatLng[]): number {
  return positions.length - positionsForMapBounds(positions).length;
}

export interface FleetLocationInput {
  vehicleId: string;
  latitude: number;
  longitude: number;
  plateNumber?: string;
}

export interface FleetLocationCluster<T extends FleetLocationInput> {
  clusterKey: string;
  latitude: number;
  longitude: number;
  vehicles: T[];
  /** Multiple vehicles rendered as one map marker (grouped). */
  collapsed: boolean;
  /** All vehicles in the group share the exact same GPS fix. */
  sameGpsFix: boolean;
}

function locationClusterKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
}

function sortVehicles<T extends FleetLocationInput>(vehicles: T[]): T[] {
  return [...vehicles].sort((a, b) =>
    (a.plateNumber ?? a.vehicleId).localeCompare(b.plateNumber ?? b.vehicleId)
  );
}

export function clusterSharesExactGps<T extends FleetLocationInput>(vehicles: T[]): boolean {
  if (vehicles.length <= 1) {
    return false;
  }
  const anchor = locationClusterKey(vehicles[0]!.latitude, vehicles[0]!.longitude);
  return vehicles.every(
    (vehicle) => locationClusterKey(vehicle.latitude, vehicle.longitude) === anchor
  );
}

/** Meters per pixel at a given zoom level and latitude (Web Mercator). */
export function metersPerPixel(zoom: number, latitude: number): number {
  return (156_543.033_92 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Group vehicles that overlap on screen at the current zoom (pixel clustering).
 * Nearby vehicles collapse into one stacked marker; zoom in to split groups apart.
 */
export function clusterFleetLocationsForZoom<T extends FleetLocationInput>(
  vehicles: T[],
  zoom: number,
  latitude: number,
  clusterPixelRadius = 52
): FleetLocationCluster<T>[] {
  if (vehicles.length === 0) {
    return [];
  }

  const cellSizeDegrees =
    (clusterPixelRadius * metersPerPixel(zoom, latitude)) / 111_320;
  const safeCellSize = Math.max(cellSizeDegrees, 1e-8);
  const groups = new Map<string, T[]>();

  for (const vehicle of vehicles) {
    const cellLat = Math.round(vehicle.latitude / safeCellSize);
    const cellLng = Math.round(vehicle.longitude / safeCellSize);
    const key = `${cellLat}:${cellLng}`;
    const group = groups.get(key);
    if (group) {
      group.push(vehicle);
    } else {
      groups.set(key, [vehicle]);
    }
  }

  return Array.from(groups.entries())
    .map(([gridKey, group]) => {
      const sorted = sortVehicles(group);
      const latitudeSum = sorted.reduce((sum, vehicle) => sum + vehicle.latitude, 0);
      const longitudeSum = sorted.reduce((sum, vehicle) => sum + vehicle.longitude, 0);
      const count = sorted.length;

      return {
        clusterKey: `${gridKey}@${zoom}`,
        latitude: latitudeSum / count,
        longitude: longitudeSum / count,
        vehicles: sorted,
        collapsed: count > 1,
        sameGpsFix: clusterSharesExactGps(sorted)
      };
    })
    .sort((a, b) =>
      (a.vehicles[0]?.plateNumber ?? a.clusterKey).localeCompare(
        b.vehicles[0]?.plateNumber ?? b.clusterKey
      )
    );
}

export function collapsedClusterCount<T extends FleetLocationInput>(
  clusters: FleetLocationCluster<T>[]
): number {
  return clusters.filter((cluster) => cluster.collapsed).length;
}

export function vehiclesInCollapsedClusters<T extends FleetLocationInput>(
  clusters: FleetLocationCluster<T>[]
): number {
  return clusters
    .filter((cluster) => cluster.collapsed)
    .reduce((sum, cluster) => sum + cluster.vehicles.length, 0);
}
