import type { CreateTripInput } from "@fleetmind/database/repositories/contracts.js";
import type { TelemetryPoint } from "@fleetmind/shared/contracts/domain.js";

export interface TripBuilderOptions {
  maxGapMinutes?: number;
  idleSpeedThresholdKph?: number;
  /** Drop segments shorter than this GPS/odometer distance (filters parked GPS jitter). */
  minTripDistanceKm?: number;
  /** Minimum haversine movement between points to treat as driving (GPS-only telematics). */
  minMovementKm?: number;
}

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MIN_TRIP_DISTANCE_KM = 0.05;
const DEFAULT_MIN_MOVEMENT_KM = 0.01;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistanceKm = (a: TelemetryPoint, b: TelemetryPoint): number => {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);
  const arc =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
};

/** Point explicitly ends a trip (ignition off). */
const pointEndsTrip = (point: TelemetryPoint): boolean => point.ignitionOn === false;

/**
 * Whether a point can start or continue a trip segment.
 * Supports GPS-only feeds (e.g. Flespi) where speed/ignition are often absent.
 */
const pointIsTripActive = (point: TelemetryPoint, previous?: TelemetryPoint, minMovementKm = DEFAULT_MIN_MOVEMENT_KM): boolean => {
  if (point.ignitionOn === false) {
    return false;
  }
  if (point.ignitionOn === true) {
    return true;
  }
  if ((point.speedKph ?? 0) > 0) {
    return true;
  }
  if (!previous) {
    return true;
  }
  return haversineDistanceKm(previous, point) >= minMovementKm;
};

const buildTripFromSegment = (
  vehicleId: string,
  segment: TelemetryPoint[],
  idleSpeedThresholdKph: number,
  minTripDistanceKm: number,
  minMovementKm: number
): CreateTripInput | null => {
  if (segment.length < 2) {
    return null;
  }

  const start = segment[0];
  const end = segment[segment.length - 1];
  if (!start || !end) {
    return null;
  }

  let gpsDistanceKm = 0;
  let idleMinutes = 0;
  for (let index = 1; index < segment.length; index += 1) {
    const previous = segment[index - 1];
    const current = segment[index];
    if (!previous || !current) {
      continue;
    }

    const stepKm = haversineDistanceKm(previous, current);
    gpsDistanceKm += stepKm;

    const speedIdle = (previous.speedKph ?? 0) <= idleSpeedThresholdKph;
    const gpsIdle = stepKm < minMovementKm;
    const ignitionIdle = previous.ignitionOn === true || previous.ignitionOn === undefined;
    if (ignitionIdle && (speedIdle || (previous.speedKph === undefined && gpsIdle))) {
      const previousTimeMs = Date.parse(previous.timestamp);
      const currentTimeMs = Date.parse(current.timestamp);
      idleMinutes += Math.max(0, (currentTimeMs - previousTimeMs) / 60000);
    }
  }

  const odometerDistanceKm =
    typeof start.odometerKm === "number" && typeof end.odometerKm === "number"
      ? Math.max(0, end.odometerKm - start.odometerKm)
      : undefined;

  const distanceKm = odometerDistanceKm ?? gpsDistanceKm;
  if (distanceKm < minTripDistanceKm) {
    return null;
  }

  const durationHours = Math.max(0, Date.parse(end.timestamp) - Date.parse(start.timestamp)) / 3_600_000;
  const averageSpeedKph = durationHours === 0 ? 0 : Number((distanceKm / durationHours).toFixed(2));

  return {
    vehicleId,
    startTime: start.timestamp,
    endTime: end.timestamp,
    startOdometerKm: start.odometerKm ?? 0,
    endOdometerKm: end.odometerKm ?? start.odometerKm ?? distanceKm,
    distanceKm: Number(distanceKm.toFixed(3)),
    idleMinutes: Number(idleMinutes.toFixed(2)),
    averageSpeedKph
  };
};

export const buildTripsFromTelemetry = (
  points: TelemetryPoint[],
  options: TripBuilderOptions = {}
): CreateTripInput[] => {
  if (points.length === 0) {
    return [];
  }

  const maxGapMinutes = options.maxGapMinutes ?? 20;
  const idleSpeedThresholdKph = options.idleSpeedThresholdKph ?? 5;
  const minTripDistanceKm = options.minTripDistanceKm ?? DEFAULT_MIN_TRIP_DISTANCE_KM;
  const minMovementKm = options.minMovementKm ?? DEFAULT_MIN_MOVEMENT_KM;
  const ordered = [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const trips: CreateTripInput[] = [];
  let segment: TelemetryPoint[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const point = ordered[index];
    if (!point) {
      continue;
    }

    if (segment.length === 0) {
      if (pointIsTripActive(point, undefined, minMovementKm)) {
        segment = [point];
      }
      continue;
    }

    const previous = segment[segment.length - 1];
    if (!previous) {
      continue;
    }

    const gapMinutes = (Date.parse(point.timestamp) - Date.parse(previous.timestamp)) / 60000;
    const closesByGap = gapMinutes > maxGapMinutes;
    const closesByIgnition = pointEndsTrip(point);

    if (closesByGap || closesByIgnition) {
      const firstPoint = segment[0];
      if (firstPoint) {
        const trip = buildTripFromSegment(
          firstPoint.vehicleId,
          segment,
          idleSpeedThresholdKph,
          minTripDistanceKm,
          minMovementKm
        );
        if (trip) {
          trips.push(trip);
        }
      }
      segment = pointIsTripActive(point, previous, minMovementKm) ? [point] : [];
      continue;
    }

    if (pointIsTripActive(point, previous, minMovementKm)) {
      segment.push(point);
    }
  }

  if (segment.length > 0) {
    const firstPoint = segment[0];
    if (firstPoint) {
      const trip = buildTripFromSegment(
        firstPoint.vehicleId,
        segment,
        idleSpeedThresholdKph,
        minTripDistanceKm,
        minMovementKm
      );
      if (trip) {
        trips.push(trip);
      }
    }
  }

  return trips;
};
