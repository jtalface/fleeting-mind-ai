/** Earth radius in meters (WGS84 mean). */
const EARTH_RADIUS_M = 6_371_000;

export type LatLng = readonly [latitude: number, longitude: number];

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

export interface SpreadMarkerInput {
  vehicleId: string;
  latitude: number;
  longitude: number;
}

export interface SpreadMarkerOutput extends SpreadMarkerInput {
  displayLatitude: number;
  displayLongitude: number;
}

/** Nudge markers that share the same GPS fix so stacked units remain clickable. */
export function spreadOverlappingMarkers<T extends SpreadMarkerInput>(vehicles: T[]): Array<T & SpreadMarkerOutput> {
  const groups = new Map<string, T[]>();

  for (const vehicle of vehicles) {
    const key = `${vehicle.latitude.toFixed(5)}:${vehicle.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) {
      group.push(vehicle);
    } else {
      groups.set(key, [vehicle]);
    }
  }

  const spread: Array<T & SpreadMarkerOutput> = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      const only = group[0]!;
      spread.push({
        ...only,
        displayLatitude: only.latitude,
        displayLongitude: only.longitude
      });
      continue;
    }

    const baseLat = group[0]!.latitude;
    const baseLng = group[0]!.longitude;
    const metersPerDegLat = 111_320;
    const metersPerDegLng = Math.max(Math.cos((baseLat * Math.PI) / 180) * 111_320, 1);
    const radiusMeters = 18;

    group.forEach((vehicle, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const dLat = (radiusMeters * Math.sin(angle)) / metersPerDegLat;
      const dLng = (radiusMeters * Math.cos(angle)) / metersPerDegLng;
      spread.push({
        ...vehicle,
        displayLatitude: baseLat + dLat,
        displayLongitude: baseLng + dLng
      });
    });
  }

  return spread;
}

export function outlierCount(positions: LatLng[]): number {
  return positions.length - positionsForMapBounds(positions).length;
}
