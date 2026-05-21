import type { Vehicle } from "@fleetmind/shared/contracts/domain.js";
import type { AnalyticsEngineInput } from "./contracts.js";
import { resolveTenantRateCard } from "./rate-card.js";

const inWindow = (timestamp: string, start: string, end: string): boolean => timestamp >= start && timestamp <= end;

export interface TopVehicleByRevenue {
  vehicleId: string;
  revenue: number;
  label: string;
}

function vehicleLabel(vehicle: Vehicle): string {
  return vehicle.plateNumber ?? vehicle.externalId ?? vehicle.vin.slice(-8);
}

/** Rank vehicles by trip revenue in the analysis window (km × rate card). */
export async function topVehiclesByRevenue(
  input: AnalyticsEngineInput,
  limit: number
): Promise<TopVehicleByRevenue[]> {
  if (limit <= 0) {
    return [];
  }

  const { repositories, window } = input;
  const [vehicles, rateCard] = await Promise.all([
    repositories.vehicles.list(),
    resolveTenantRateCard(repositories, input.tenantId)
  ]);

  const ranked: TopVehicleByRevenue[] = [];
  for (const vehicle of vehicles) {
    const trips = (await repositories.trips.listByVehicle(vehicle.id)).filter((trip) =>
      inWindow(trip.endTime, window.start, window.end)
    );
    const revenue = trips.reduce((sum, trip) => sum + trip.distanceKm * rateCard.revenuePerKm, 0);
    if (revenue > 0) {
      ranked.push({ vehicleId: vehicle.id, revenue, label: vehicleLabel(vehicle) });
    }
  }

  return ranked.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
