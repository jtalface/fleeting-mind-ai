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
}

export interface ConversationRepository {
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  addMessage(input: CreateConversationMessageInput): Promise<ConversationMessage>;
  listMessages(conversationId: string): Promise<ConversationMessage[]>;
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
}
