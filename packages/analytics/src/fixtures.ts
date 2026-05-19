import type { AnalyticsDataPoint } from "./contracts.js";

export const benchmarkHistoryFixture: AnalyticsDataPoint[] = [
  { date: "2026-04-01", revenue: 4200, cost: 3000, fuelCostPerKm: 0.72, idleRatioPct: 19, utilizationPct: 81 },
  { date: "2026-04-02", revenue: 4320, cost: 3040, fuelCostPerKm: 0.74, idleRatioPct: 20, utilizationPct: 80 },
  { date: "2026-04-03", revenue: 4390, cost: 3090, fuelCostPerKm: 0.73, idleRatioPct: 18, utilizationPct: 82 },
  { date: "2026-04-04", revenue: 4480, cost: 3160, fuelCostPerKm: 0.75, idleRatioPct: 21, utilizationPct: 79 },
  { date: "2026-04-05", revenue: 4560, cost: 3200, fuelCostPerKm: 0.76, idleRatioPct: 22, utilizationPct: 78 },
  { date: "2026-04-06", revenue: 4620, cost: 3240, fuelCostPerKm: 0.77, idleRatioPct: 20, utilizationPct: 80 },
  { date: "2026-04-07", revenue: 4710, cost: 3310, fuelCostPerKm: 0.78, idleRatioPct: 23, utilizationPct: 77 },
  { date: "2026-04-08", revenue: 4780, cost: 3360, fuelCostPerKm: 0.79, idleRatioPct: 24, utilizationPct: 76 },
  { date: "2026-04-09", revenue: 4860, cost: 3420, fuelCostPerKm: 0.8, idleRatioPct: 23, utilizationPct: 77 },
  { date: "2026-04-10", revenue: 4950, cost: 3470, fuelCostPerKm: 0.81, idleRatioPct: 24, utilizationPct: 76 }
];

export const goldenForecastRevenueFirst3Days = [5028, 5108.1818, 5188.3636];
