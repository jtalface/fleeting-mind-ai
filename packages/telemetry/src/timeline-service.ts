import type { TenantRepositorySet } from "@fleetmind/database/repositories/contracts.js";
import type { VehicleTimeline, VehicleTimelineQueryInput } from "@fleetmind/shared/contracts/telemetry.js";

export class VehicleTimelineService {
  public constructor(private readonly repositories: Pick<TenantRepositorySet, "telemetry" | "trips">) {}

  public async queryVehicleTimeline(input: VehicleTimelineQueryInput): Promise<VehicleTimeline> {
    const telemetryLimit = input.telemetryLimit ?? 500;
    const [telemetryPoints, trips] = await Promise.all([
      this.repositories.telemetry.listByVehicle(input.vehicleId, telemetryLimit),
      this.repositories.trips.listByVehicle(input.vehicleId)
    ]);

    return {
      vehicleId: input.vehicleId,
      telemetryPoints: [...telemetryPoints].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      trips: [...trips].sort((a, b) => a.startTime.localeCompare(b.startTime))
    };
  }
}

export const createVehicleTimelineService = (
  repositories: Pick<TenantRepositorySet, "telemetry" | "trips">
): VehicleTimelineService => new VehicleTimelineService(repositories);

export const query_vehicle_timeline = async (
  repositories: Pick<TenantRepositorySet, "telemetry" | "trips">,
  input: VehicleTimelineQueryInput
): Promise<VehicleTimeline> => createVehicleTimelineService(repositories).queryVehicleTimeline(input);
