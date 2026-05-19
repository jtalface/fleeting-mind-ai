import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type {
  TelemetryIngestInput,
  TelemetryIngestPointInput,
  TelemetryIngestResult
} from "@fleetmind/shared/contracts/telemetry.js";
import { telemetryPointSchema } from "./validation.js";
import { buildTripsFromTelemetry } from "./trip-builder.js";

const pointSignature = (point: TelemetryIngestPointInput): string =>
  [
    point.vehicleId,
    point.timestamp,
    point.latitude.toFixed(6),
    point.longitude.toFixed(6),
    point.source,
    point.ignitionOn === undefined ? "none" : String(point.ignitionOn)
  ].join("|");

const tripSignature = (trip: { vehicleId: string; startTime: string; endTime: string }): string =>
  `${trip.vehicleId}|${trip.startTime}|${trip.endTime}`;

const toTelemetryIngestPointInput = (
  point: ReturnType<typeof telemetryPointSchema.parse>
): TelemetryIngestPointInput => {
  const normalized: TelemetryIngestPointInput = {
    vehicleId: point.vehicleId,
    timestamp: point.timestamp,
    latitude: point.latitude,
    longitude: point.longitude,
    source: point.source
  };

  if (point.speedKph !== undefined) normalized.speedKph = point.speedKph;
  if (point.headingDegrees !== undefined) normalized.headingDegrees = point.headingDegrees;
  if (point.engineRpm !== undefined) normalized.engineRpm = point.engineRpm;
  if (point.ignitionOn !== undefined) normalized.ignitionOn = point.ignitionOn;
  if (point.fuelLevelPct !== undefined) normalized.fuelLevelPct = point.fuelLevelPct;
  if (point.odometerKm !== undefined) normalized.odometerKm = point.odometerKm;
  if (point.engineHours !== undefined) normalized.engineHours = point.engineHours;

  return normalized;
};

export class TelemetryIngestService {
  public constructor(private readonly repositories: TenantRepositorySet) {}

  public async ingest(input: TelemetryIngestInput): Promise<TelemetryIngestResult> {
    const point = toTelemetryIngestPointInput(telemetryPointSchema.parse(input.point));

    const existingByTimestamp = await this.repositories.telemetry.findByVehicleAndTimestamp(
      point.vehicleId,
      point.timestamp
    );
    if (existingByTimestamp) {
      return {
        telemetryPoint: existingByTimestamp,
        deduplicated: true,
        createdTrips: []
      };
    }

    if (input.skipTripConstruction) {
      const telemetryPoint = await this.repositories.telemetry.create(point);
      return {
        telemetryPoint,
        deduplicated: false,
        createdTrips: []
      };
    }

    const recentPoints = await this.repositories.telemetry.listByVehicle(point.vehicleId, 500);

    const incomingSignature = pointSignature(point);
    const existingMatch = recentPoints.find((existingPoint) => pointSignature(existingPoint) === incomingSignature);

    if (existingMatch) {
      return {
        telemetryPoint: existingMatch,
        deduplicated: true,
        createdTrips: []
      };
    }

    const telemetryPoint = await this.repositories.telemetry.create(point);
    const timeline = [...recentPoints, telemetryPoint];
    const candidateTrips = buildTripsFromTelemetry(timeline);
    const existingTrips = await this.repositories.trips.listByVehicle(point.vehicleId);
    const existingTripSignatures = new Set(existingTrips.map((trip) => tripSignature(trip)));

    const createdTrips = [];
    for (const trip of candidateTrips) {
      const signature = tripSignature(trip);
      if (existingTripSignatures.has(signature)) {
        continue;
      }

      createdTrips.push(await this.repositories.trips.create(trip));
      existingTripSignatures.add(signature);
    }

    return {
      telemetryPoint,
      deduplicated: false,
      createdTrips
    };
  }
}

export const createTelemetryIngestService = (repositories: TenantRepositorySet): TelemetryIngestService =>
  new TelemetryIngestService(repositories);
