import type { DeterministicForecast, ForecastExplanation } from "@fleetmind/shared/contracts/analytics.js";
import type { PredictionScopeType } from "@fleetmind/shared/contracts/predictions.js";
import type {
  Conversation,
  ConversationMessage,
  FuelReading,
  Insight,
  MaintenanceRecord,
  TelemetryPoint,
  Trip,
  Vehicle
} from "@fleetmind/shared/contracts/domain.js";

export interface CreateVehicleInput extends Omit<Vehicle, "id" | "createdAt" | "updatedAt" | "tenantId"> {}
export interface CreateTripInput extends Omit<Trip, "id" | "tenantId"> {}
export interface CreateFuelReadingInput extends Omit<FuelReading, "id" | "tenantId"> {}
export interface CreateMaintenanceRecordInput extends Omit<MaintenanceRecord, "id" | "tenantId"> {}
export interface CreateInsightInput extends Omit<Insight, "id" | "tenantId" | "createdAt"> {
  id?: string;
}
export interface CreateConversationInput extends Pick<Conversation, "subject"> {}
export interface CreateConversationMessageInput extends Omit<ConversationMessage, "id" | "tenantId" | "createdAt"> {}

export interface UpsertVehicleFromExternalInput {
  externalId: string;
  vin: string;
  plateNumber?: string;
  class: Vehicle["class"];
  make?: string;
  model?: string;
  year?: number;
  odometerKm?: number;
  active?: boolean;
}

export interface VehicleRepository {
  create(input: CreateVehicleInput): Promise<Vehicle>;
  list(): Promise<Vehicle[]>;
  findById(id: string): Promise<Vehicle | null>;
  findByExternalId(externalId: string): Promise<Vehicle | null>;
  upsertFromExternal(input: UpsertVehicleFromExternalInput): Promise<Vehicle>;
}

export interface IntegrationSyncStateRecord {
  tenantId: string;
  connector: string;
  cursor?: string;
  lastSyncedAt?: string;
  lastStatus?: string;
  lastError?: string;
}

export interface IntegrationSyncStateRepository {
  get(connector: string): Promise<IntegrationSyncStateRecord | null>;
  upsert(state: IntegrationSyncStateRecord): Promise<IntegrationSyncStateRecord>;
}

export interface TelemetryRepository {
  create(input: Omit<TelemetryPoint, "tenantId">): Promise<TelemetryPoint>;
  findByVehicleAndTimestamp(vehicleId: string, timestamp: string): Promise<TelemetryPoint | null>;
  listByVehicle(vehicleId: string, limit?: number): Promise<TelemetryPoint[]>;
}

export interface TripRepository {
  create(input: CreateTripInput): Promise<Trip>;
  listByVehicle(vehicleId: string): Promise<Trip[]>;
}

export interface FuelRepository {
  create(input: CreateFuelReadingInput): Promise<FuelReading>;
  listByVehicle(vehicleId: string): Promise<FuelReading[]>;
}

export interface MaintenanceRepository {
  create(input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord>;
  listOpen(): Promise<MaintenanceRecord[]>;
}

export interface InsightRepository {
  create(input: CreateInsightInput): Promise<Insight>;
  listRecent(limit?: number): Promise<Insight[]>;
  /** Removes pre-LLM rule-based insight rows (insight_idle_*, insight_fleet_*, insight_fuel_*). */
  deleteLegacyRuleBased(): Promise<number>;
}

export interface ConversationRepository {
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  addMessage(input: CreateConversationMessageInput): Promise<ConversationMessage>;
  listMessages(conversationId: string): Promise<ConversationMessage[]>;
}

export interface TenantRateCardRecord {
  tenantId: string;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency: string;
}

export interface UpsertTenantRateCardInput {
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency?: string;
}

export interface RateCardRepository {
  get(): Promise<TenantRateCardRecord>;
  upsert(input: UpsertTenantRateCardInput): Promise<TenantRateCardRecord>;
}

export interface FleetMetricDailyRow {
  tenantId: string;
  vehicleId: string;
  date: string;
  revenue: number;
  operatingCost: number;
  fuelCost: number;
  distanceKm: number;
  tripCount: number;
  idleRatioPct: number;
  utilizationPct: number;
}

export interface FleetDailyAggregate {
  date: string;
  revenue: number;
  cost: number;
  fuelCostPerKm: number;
  idleRatioPct: number;
  utilizationPct: number;
}

export interface FleetMetricDailyRepository {
  upsertMany(rows: FleetMetricDailyRow[]): Promise<void>;
  listAggregatedByDay(window: { start: string; end: string }): Promise<FleetDailyAggregate[]>;
}

export type ForecastEvaluationKind = "holdout" | "forward";

export interface ForecastEvaluationRecord {
  tenantId: string;
  scopeType: PredictionScopeType;
  scopeKey: string;
  metricKey: string;
  algorithm: string;
  trainedUntil: string;
  horizonDays: number;
  evaluationKind: ForecastEvaluationKind;
  runId?: string;
  mae: number;
  mapePct: number;
  withinBandPct: number;
  sampleSize: number;
}

export interface ForecastEvaluationStored extends ForecastEvaluationRecord {
  id: string;
  createdAt: string;
}

export interface ListForecastEvaluationsQuery {
  limit?: number;
  metricKey?: string;
  scopeType?: PredictionScopeType;
  scopeKey?: string;
  evaluationKind?: ForecastEvaluationKind;
}

export interface ForecastEvaluationRepository {
  upsert(record: ForecastEvaluationRecord): Promise<ForecastEvaluationStored>;
  listRecent(query?: ListForecastEvaluationsQuery): Promise<ForecastEvaluationStored[]>;
  listTrends(query?: { limit?: number; evaluationKind?: ForecastEvaluationKind }): Promise<ForecastEvaluationStored[]>;
}

export interface PredictionPointRecord {
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

export interface PredictionRunRecord {
  tenantId: string;
  scopeType: PredictionScopeType;
  scopeKey: string;
  nameIncludes?: string;
  metricKey: DeterministicForecast["metricKey"];
  algorithm: string;
  trainedUntil: string;
  horizonDays: number;
  sampleSize: number;
  backtestMapePct?: number;
  championSelected: boolean;
  explanation: ForecastExplanation;
  points: PredictionPointRecord[];
}

export interface PredictionRunStored extends Omit<PredictionRunRecord, "points"> {
  id: string;
  createdAt: string;
  points: PredictionPointRecord[];
}

export interface ListLatestPredictionRunsQuery {
  horizonDays: number;
  scopeType?: PredictionScopeType;
  scopeKey?: string;
  metricKey?: string;
}

export interface ListMaturePredictionRunsQuery {
  horizonDays?: number;
  limit?: number;
}

export interface PredictionRunRepository {
  /** @deprecated Use {@link appendRun} — kept as alias for compatibility. */
  replaceRun(record: PredictionRunRecord): Promise<PredictionRunStored>;
  appendRun(record: PredictionRunRecord): Promise<PredictionRunStored>;
  pruneOldRuns(options?: { maxPerSeries?: number }): Promise<number>;
  listLatest(query: ListLatestPredictionRunsQuery): Promise<PredictionRunStored[]>;
  /** Runs whose full forecast horizon is in the past (eligible for forward scoring). */
  listMature(query?: ListMaturePredictionRunsQuery): Promise<PredictionRunStored[]>;
}

export interface TenantRepositorySet {
  vehicles: VehicleRepository;
  telemetry: TelemetryRepository;
  trips: TripRepository;
  fuel: FuelRepository;
  maintenance: MaintenanceRepository;
  insights: InsightRepository;
  conversations: ConversationRepository;
  integrationSync?: IntegrationSyncStateRepository;
  rateCards?: RateCardRepository;
  fleetMetricDaily?: FleetMetricDailyRepository;
  forecastEvaluations?: ForecastEvaluationRepository;
  predictionRuns?: PredictionRunRepository;
}
