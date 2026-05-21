import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "../../database/src/repositories/in-memory.js";
import { activateBillingContract, applyBillingContractToRateCard } from "./sync-rate-card-from-contract.js";

describe("sync-rate-card-from-contract", () => {
  it("activates contract and copies rates to tenant rate card", async () => {
    const repos = createInMemoryTenantRepositories("tenant_test");
    const contract = await repos.billingContracts!.create({
      name: "Municipal sweeper",
      externalJobId: "JOB-SWEEP-01",
      revenuePerKm: 3.2,
      operatingCostPerKm: 0.85,
      currency: "USD"
    });

    const activated = await activateBillingContract(repos, contract.id);
    expect(activated?.isActive).toBe(true);

    const card = await repos.rateCards!.get();
    expect(card.revenuePerKm).toBe(3.2);
    expect(card.operatingCostPerKm).toBe(0.85);
    expect(card.sourceContractId).toBe(contract.id);
  });

  it("applyBillingContractToRateCard updates rates without activating", async () => {
    const repos = createInMemoryTenantRepositories("tenant_test2");
    const contract = await repos.billingContracts!.create({
      name: "Night route",
      revenuePerKm: 2.5,
      operatingCostPerKm: 0.7
    });

    await applyBillingContractToRateCard(repos, {
      ...contract,
      isActive: false
    });

    const card = await repos.rateCards!.get();
    expect(card.revenuePerKm).toBe(2.5);
    expect(card.sourceContractId).toBe(contract.id);
  });
});
