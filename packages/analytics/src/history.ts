import type { AnalyticsDataPoint, AnalyticsEngineInput } from "./contracts.js";

const dayKey = (iso: string): string => iso.slice(0, 10);

/**
 * Builds daily rollup series from persisted trips and fuel readings for deterministic forecasts.
 */
export async function buildDailyHistoryFromRepositories(
  input: AnalyticsEngineInput,
  maxDays = 90
): Promise<AnalyticsDataPoint[]> {
  const { repositories, window } = input;
  const vehicles = await repositories.vehicles.list();
  const byDay = new Map<string, AnalyticsDataPoint>();

  for (const vehicle of vehicles) {
    const [trips, fuelReadings] = await Promise.all([
      repositories.trips.listByVehicle(vehicle.id),
      repositories.fuel.listByVehicle(vehicle.id)
    ]);

    for (const trip of trips) {
      if (trip.endTime < window.start || trip.endTime > window.end) {
        continue;
      }
      const key = dayKey(trip.endTime);
      const row = byDay.get(key) ?? emptyDay(key);
      row.revenue += trip.distanceKm * 2.1;
      row.cost += trip.distanceKm * 0.6;
      const tripMinutes = (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 60_000;
      const idleRatio = tripMinutes > 0 ? (trip.idleMinutes / tripMinutes) * 100 : 0;
      row.idleRatioPct += idleRatio;
      row.utilizationPct += tripMinutes > 0 ? ((tripMinutes - trip.idleMinutes) / tripMinutes) * 100 : 0;
      byDay.set(key, row);
    }

    for (const fuel of fuelReadings) {
      if (fuel.timestamp < window.start || fuel.timestamp > window.end) {
        continue;
      }
      const key = dayKey(fuel.timestamp);
      const row = byDay.get(key) ?? emptyDay(key);
      row.cost += fuel.totalCost;
      byDay.set(key, row);
    }
  }

  const sorted = [...byDay.values()]
    .map((row) => {
      const vehicleCount = Math.max(1, vehicles.length);
      const { profit: _profit, ...rest } = row;
      return {
        ...rest,
        fuelCostPerKm: row.revenue > 0 ? row.cost / Math.max(row.revenue / 2.1, 1) : 0,
        idleRatioPct: row.idleRatioPct / vehicleCount,
        utilizationPct: row.utilizationPct / vehicleCount
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxDays);

  return sorted;
}

function emptyDay(date: string): AnalyticsDataPoint & { profit: number } {
  return {
    date,
    revenue: 0,
    cost: 0,
    fuelCostPerKm: 0,
    idleRatioPct: 0,
    utilizationPct: 0,
    profit: 0
  };
}
