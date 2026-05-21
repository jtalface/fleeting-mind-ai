import type { TenantRateCardRecord, TenantRepositorySet } from "../../database/src/repositories/contracts.js";

export const DEFAULT_REVENUE_PER_KM = 2.1;
export const DEFAULT_OPERATING_COST_PER_KM = 0.6;

export const defaultRateCard = (tenantId: string): TenantRateCardRecord => ({
  tenantId,
  revenuePerKm: DEFAULT_REVENUE_PER_KM,
  operatingCostPerKm: DEFAULT_OPERATING_COST_PER_KM,
  currency: "USD"
});

export async function resolveTenantRateCard(
  repositories: TenantRepositorySet,
  tenantId: string
): Promise<TenantRateCardRecord> {
  if (repositories.rateCards) {
    return repositories.rateCards.get();
  }
  return defaultRateCard(tenantId);
}
