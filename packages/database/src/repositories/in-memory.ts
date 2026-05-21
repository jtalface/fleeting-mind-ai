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
  FleetDailyAggregate,
  FleetMetricDailyRow,
  ForecastEvaluationRecord,
  IntegrationSyncStateRecord,
  ListLatestPredictionRunsQuery,
  PredictionRunRecord,
  PredictionRunStored,
  TenantRateCardRecord,
  TenantRepositorySet,
  UpsertTenantRateCardInput,
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
  private rateCard: TenantRateCardRecord;
  private readonly martStore: FleetMetricDailyRow[] = [];
  private readonly forecastEvalStore: ForecastEvaluationRecord[] = [];

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
      const existingByExternal = await this.vehicles.findByExternalId(input.externalId);
      const existingByVin =
        this.vehiclesStore.find((item) => item.tenantId === this.tenantId && item.vin === input.vin) ?? null;
      const existing = existingByExternal ?? existingByVin;
      if (existing) {
        Object.assign(existing, {
          externalId: input.externalId,
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

  public readonly rateCards = {
    get: async (): Promise<TenantRateCardRecord> => this.rateCard,
    upsert: async (input: UpsertTenantRateCardInput): Promise<TenantRateCardRecord> => {
      this.rateCard = {
        tenantId: this.tenantId,
        revenuePerKm: input.revenuePerKm,
        operatingCostPerKm: input.operatingCostPerKm,
        currency: input.currency ?? "USD"
      };
      return this.rateCard;
    }
  };

  public readonly fleetMetricDaily = {
    upsertMany: async (rows: FleetMetricDailyRow[]): Promise<void> => {
      for (const row of rows) {
        const index = this.martStore.findIndex(
          (item) => item.tenantId === row.tenantId && item.vehicleId === row.vehicleId && item.date === row.date
        );
        if (index >= 0) {
          this.martStore[index] = row;
        } else {
          this.martStore.push(row);
        }
      }
    },
    listAggregatedByDay: async (window: { start: string; end: string }): Promise<FleetDailyAggregate[]> => {
      const filtered = this.martStore.filter(
        (item) => item.tenantId === this.tenantId && item.date >= window.start.slice(0, 10) && item.date <= window.end.slice(0, 10)
      );
      const byDay = new Map<string, FleetDailyAggregate & { fuelCost: number; distanceKm: number; samples: number }>();
      for (const row of filtered) {
        const existing = byDay.get(row.date) ?? {
          date: row.date,
          revenue: 0,
          cost: 0,
          fuelCost: 0,
          distanceKm: 0,
          fuelCostPerKm: 0,
          idleRatioPct: 0,
          utilizationPct: 0,
          samples: 0
        };
        existing.revenue += row.revenue;
        existing.cost += row.operatingCost;
        existing.fuelCost += row.fuelCost;
        existing.distanceKm += row.distanceKm;
        existing.idleRatioPct += row.idleRatioPct;
        existing.utilizationPct += row.utilizationPct;
        existing.samples += 1;
        byDay.set(row.date, existing);
      }
      return [...byDay.values()].map((row) => {
        const samples = Math.max(1, row.samples);
        return {
          date: row.date,
          revenue: row.revenue,
          cost: row.cost,
          fuelCostPerKm: row.distanceKm > 0 ? row.fuelCost / row.distanceKm : 0,
          idleRatioPct: row.idleRatioPct / samples,
          utilizationPct: row.utilizationPct / samples
        };
      });
    }
  };

  public readonly forecastEvaluations = {
    create: async (record: ForecastEvaluationRecord): Promise<void> => {
      this.forecastEvalStore.push(record);
    }
  };

  private readonly predictionRunStore: PredictionRunStored[] = [];

  public readonly predictionRuns = {
    replaceRun: async (record: PredictionRunRecord): Promise<void> => {
      const idx = this.predictionRunStore.findIndex(
        (row) =>
          row.scopeType === record.scopeType &&
          row.scopeKey === record.scopeKey &&
          row.metricKey === record.metricKey &&
          row.horizonDays === record.horizonDays
      );
      const stored: PredictionRunStored = {
        id: randomId("pred"),
        tenantId: record.tenantId,
        scopeType: record.scopeType,
        scopeKey: record.scopeKey,
        ...(record.nameIncludes ? { nameIncludes: record.nameIncludes } : {}),
        metricKey: record.metricKey,
        algorithm: record.algorithm,
        trainedUntil: record.trainedUntil,
        horizonDays: record.horizonDays,
        sampleSize: record.sampleSize,
        ...(record.backtestMapePct !== undefined ? { backtestMapePct: record.backtestMapePct } : {}),
        championSelected: record.championSelected,
        explanation: record.explanation,
        createdAt: nowIso(),
        points: record.points
      };
      if (idx >= 0) {
        this.predictionRunStore[idx] = stored;
      } else {
        this.predictionRunStore.push(stored);
      }
    },
    listLatest: async (query: ListLatestPredictionRunsQuery): Promise<PredictionRunStored[]> => {
      const filtered = this.predictionRunStore
        .filter((row) => row.tenantId === this.tenantId && row.horizonDays === query.horizonDays)
        .filter((row) => (query.scopeType ? row.scopeType === query.scopeType : true))
        .filter((row) => (query.scopeKey ? row.scopeKey === query.scopeKey : true))
        .filter((row) => (query.metricKey ? row.metricKey === query.metricKey : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const seen = new Set<string>();
      const latest: PredictionRunStored[] = [];
      for (const row of filtered) {
        const key = `${row.scopeType}:${row.scopeKey}:${row.metricKey}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        latest.push(row);
      }
      return latest;
    }
  };

  public readonly integrationSync = {
    get: async (connector: string): Promise<IntegrationSyncStateRecord | null> =>
      this.syncStateStore.get(`${this.tenantId}:${connector}`) ?? null,
    upsert: async (state: IntegrationSyncStateRecord): Promise<IntegrationSyncStateRecord> => {
      this.syncStateStore.set(`${this.tenantId}:${state.connector}`, state);
      return state;
    }
  };

  public constructor(private readonly tenantId: string) {
    this.rateCard = {
      tenantId,
      revenuePerKm: 2.1,
      operatingCostPerKm: 0.6,
      currency: "USD"
    };
  }
}

export const createInMemoryTenantRepositories = (tenantId: string): TenantRepositorySet =>
  new InMemoryTenantRepositories(tenantId);
