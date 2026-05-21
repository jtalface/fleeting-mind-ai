import type { TenantBillingContract } from "@fleetmind/shared/contracts/billing-contracts.js";
import type { TenantRepositorySet } from "../../database/src/repositories/contracts.js";

export async function applyBillingContractToRateCard(
  repositories: TenantRepositorySet,
  contract: TenantBillingContract
): Promise<void> {
  if (!repositories.rateCards) {
    return;
  }
  await repositories.rateCards.upsert({
    revenuePerKm: contract.revenuePerKm,
    operatingCostPerKm: contract.operatingCostPerKm,
    currency: contract.currency,
    sourceContractId: contract.id
  });
}

export async function activateBillingContract(
  repositories: TenantRepositorySet,
  contractId: string
): Promise<TenantBillingContract | null> {
  const repo = repositories.billingContracts;
  if (!repo) {
    return null;
  }
  const contract = await repo.activate(contractId);
  if (contract) {
    await applyBillingContractToRateCard(repositories, contract);
  }
  return contract;
}
