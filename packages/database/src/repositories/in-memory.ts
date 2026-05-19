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
import type {
  CreateConversationInput,
  CreateConversationMessageInput,
  CreateFuelReadingInput,
  CreateInsightInput,
  CreateMaintenanceRecordInput,
  CreateTripInput,
  CreateVehicleInput,
  IntegrationSyncStateRecord,
  TenantRepositorySet,
  UpsertVehicleFromExternalInput
} from "./contracts.js";

const nowIso = (): string => new Date().toISOString();
const randomId = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 11)}`;

export class InMemoryTenantRepositories implements TenantRepositorySet {
  private readonly vehiclesStore: Vehicle[] = [];
  private readonly telemetryStore: TelemetryPoint[] = [];
  private readonly tripsStore: Trip[] = [];
  private readonly fuelStore: FuelReading[] = [];
  private readonly maintenanceStore: MaintenanceRecord[] = [];
  private readonly insightsStore: Insight[] = [];
  private readonly conversationsStore: Conversation[] = [];
  private readonly messagesStore: ConversationMessage[] = [];
  private readonly syncStateStore = new Map<string, IntegrationSyncStateRecord>();

  public readonly vehicles = {
    create: async (input: CreateVehicleInput): Promise<Vehicle> => {
      const record: Vehicle = {
        id: randomId("veh"),
        tenantId: this.tenantId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input
      };
      this.vehiclesStore.push(record);
      return record;
    },
    list: async (): Promise<Vehicle[]> => this.vehiclesStore.filter((item) => item.tenantId === this.tenantId),
    findById: async (id: string): Promise<Vehicle | null> =>
      this.vehiclesStore.find((item) => item.id === id && item.tenantId === this.tenantId) ?? null,
    findByExternalId: async (externalId: string): Promise<Vehicle | null> =>
      this.vehiclesStore.find((item) => item.externalId === externalId && item.tenantId === this.tenantId) ??
      null,
    upsertFromExternal: async (input: UpsertVehicleFromExternalInput): Promise<Vehicle> => {
      const existing = await this.vehicles.findByExternalId(input.externalId);
      if (existing) {
        Object.assign(existing, {
          vin: input.vin,
          plateNumber: input.plateNumber,
          class: input.class,
          make: input.make,
          model: input.model,
          year: input.year,
          odometerKm: input.odometerKm,
          active: input.active ?? true,
          updatedAt: nowIso()
        });
        return existing;
      }
      return this.vehicles.create({
        externalId: input.externalId,
        vin: input.vin,
        ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
        class: input.class,
        ...(input.make !== undefined ? { make: input.make } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.year !== undefined ? { year: input.year } : {}),
        ...(input.odometerKm !== undefined ? { odometerKm: input.odometerKm } : {}),
        active: input.active ?? true
      });
    }
  };

  public readonly telemetry = {
    create: async (input: Omit<TelemetryPoint, "tenantId">): Promise<TelemetryPoint> => {
      const record: TelemetryPoint = { ...input, tenantId: this.tenantId };
      this.telemetryStore.push(record);
      return record;
    },
    findByVehicleAndTimestamp: async (vehicleId: string, timestamp: string): Promise<TelemetryPoint | null> => {
      const second = Math.floor(Date.parse(timestamp) / 1000);
      return (
        this.telemetryStore.find(
          (item) =>
            item.tenantId === this.tenantId &&
            item.vehicleId === vehicleId &&
            Math.floor(Date.parse(item.timestamp) / 1000) === second
        ) ?? null
      );
    },
    listByVehicle: async (vehicleId: string, limit = 100): Promise<TelemetryPoint[]> =>
      this.telemetryStore
        .filter((item) => item.tenantId === this.tenantId && item.vehicleId === vehicleId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit)
  };

  public readonly trips = {
    create: async (input: CreateTripInput): Promise<Trip> => {
      const record: Trip = { id: randomId("trip"), tenantId: this.tenantId, ...input };
      this.tripsStore.push(record);
      return record;
    },
    listByVehicle: async (vehicleId: string): Promise<Trip[]> =>
      this.tripsStore
        .filter((item) => item.tenantId === this.tenantId && item.vehicleId === vehicleId)
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
  };

  public readonly fuel = {
    create: async (input: CreateFuelReadingInput): Promise<FuelReading> => {
      const record: FuelReading = { id: randomId("fuel"), tenantId: this.tenantId, ...input };
      this.fuelStore.push(record);
      return record;
    },
    listByVehicle: async (vehicleId: string): Promise<FuelReading[]> =>
      this.fuelStore
        .filter((item) => item.tenantId === this.tenantId && item.vehicleId === vehicleId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  };

  public readonly maintenance = {
    create: async (input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> => {
      const record: MaintenanceRecord = { id: randomId("mnt"), tenantId: this.tenantId, ...input };
      this.maintenanceStore.push(record);
      return record;
    },
    listOpen: async (): Promise<MaintenanceRecord[]> =>
      this.maintenanceStore.filter(
        (item) => item.tenantId === this.tenantId && item.status !== "completed" && item.status !== "canceled"
      )
  };

  public readonly insights = {
    create: async (input: CreateInsightInput): Promise<Insight> => {
      const { id: requestedId, ...rest } = input;
      const record: Insight = {
        id: requestedId ?? randomId("ins"),
        tenantId: this.tenantId,
        createdAt: nowIso(),
        ...rest
      };
      this.insightsStore.push(record);
      return record;
    },
    listRecent: async (limit = 20): Promise<Insight[]> =>
      this.insightsStore
        .filter((item) => item.tenantId === this.tenantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
  };

  public readonly conversations = {
    createConversation: async (input: CreateConversationInput): Promise<Conversation> => {
      const createdAt = nowIso();
      const record: Conversation = {
        id: randomId("conv"),
        tenantId: this.tenantId,
        ...(input.subject ? { subject: input.subject } : {}),
        createdAt,
        updatedAt: createdAt
      };
      this.conversationsStore.push(record);
      return record;
    },
    addMessage: async (input: CreateConversationMessageInput): Promise<ConversationMessage> => {
      const conversation = this.conversationsStore.find(
        (item) => item.id === input.conversationId && item.tenantId === this.tenantId
      );
      if (!conversation) {
        throw new Error("Conversation not found for tenant.");
      }

      const message: ConversationMessage = {
        id: randomId("msg"),
        tenantId: this.tenantId,
        createdAt: nowIso(),
        ...input
      };
      this.messagesStore.push(message);
      conversation.updatedAt = message.createdAt;
      return message;
    },
    listMessages: async (conversationId: string): Promise<ConversationMessage[]> =>
      this.messagesStore
        .filter((item) => item.tenantId === this.tenantId && item.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };

  public readonly integrationSync = {
    get: async (connector: string): Promise<IntegrationSyncStateRecord | null> =>
      this.syncStateStore.get(`${this.tenantId}:${connector}`) ?? null,
    upsert: async (state: IntegrationSyncStateRecord): Promise<IntegrationSyncStateRecord> => {
      this.syncStateStore.set(`${this.tenantId}:${state.connector}`, state);
      return state;
    }
  };

  public constructor(private readonly tenantId: string) {}
}

export const createInMemoryTenantRepositories = (tenantId: string): TenantRepositorySet =>
  new InMemoryTenantRepositories(tenantId);
