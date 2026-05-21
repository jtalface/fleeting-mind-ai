import type { TenantId, TimestampIso } from "./domain.js";

export interface TenantBillingContract {
  id: string;
  tenantId: TenantId;
  /** Display name (e.g. municipal sweeper job). */
  name: string;
  /** Optional external job or contract reference. */
  externalJobId?: string;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency: string;
  isActive: boolean;
  effectiveFrom: TimestampIso;
  notes?: string;
  createdAt: TimestampIso;
  updatedAt: TimestampIso;
}

export interface CreateBillingContractInput {
  name: string;
  externalJobId?: string;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency?: string;
  notes?: string;
}

export interface BillingContractListResult {
  tenantId: TenantId;
  contracts: TenantBillingContract[];
  activeContractId?: string;
}
