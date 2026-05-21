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
  ForecastEvaluationKind,
  ForecastEvaluationRecord,
  ForecastEvaluationStored,
  ListMaturePredictionRunsQuery,
  IntegrationSyncStateRecord,
  ListLatestPredictionRunsQuery,
  PredictionRunRecord,
  PredictionRunStored,
  CreateBillingContractRecordInput,
  TenantRepositorySet,
  UpsertTenantRateCardInput,
  UpsertVehicleFromExternalInput
} from "./contracts.js";
import { Prisma } from "@prisma/client";
import { normalizeTelemetryTimestamp } from "../telemetry-timestamp.js";

type VehicleRow = Omit<Vehicle, "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date };
type TelemetryPointRow = Omit<TelemetryPoint, "timestamp"> & { id: string; timestamp: Date };
type TripRow = Omit<Trip, "startTime" | "endTime"> & { startTime: Date; endTime: Date; createdAt: Date };
type FuelReadingRow = Omit<FuelReading, "timestamp"> & { timestamp: Date; createdAt: Date };
type MaintenanceRecordRow = Omit<MaintenanceRecord, "occurredAt" | "dueAt"> & {
  occurredAt?: Date | null;
  dueAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type InsightMetricRow = {
  metricKey: string;
  value: number;
  unit: "currency" | "percent" | "ratio" | "distance" | "duration" | "count";
  timeframe: string;
  asOf: Date;
};
type InsightRow = Omit<Insight, "createdAt" | "supportingMetrics"> & {
  createdAt: Date;
  metrics: InsightMetricRow[];
};
type ConversationRow = Omit<Conversation, "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date };
type ConversationMessageRow = Omit<ConversationMessage, "createdAt"> & { createdAt: Date };

type Delegate<TCreateInput, TListInput, TRow> = {
  create(args: { data: TCreateInput }): Promise<TRow>;
  findMany(args: TListInput): Promise<TRow[]>;
};

type VehicleDelegate = Delegate<
  Omit<Vehicle, "id" | "createdAt" | "updatedAt">,
  { where: { tenantId: string }; orderBy?: { createdAt: "desc" | "asc" } },
  VehicleRow
> & {
  findFirst(args: {
    where: { id?: string; tenantId: string; externalId?: string; vin?: string };
  }): Promise<VehicleRow | null>;
  update(args: {
    where: { id: string };
    data: Partial<Omit<Vehicle, "id" | "tenantId" | "createdAt" | "updatedAt">>;
  }): Promise<VehicleRow>;
};

type TelemetryDelegate = Delegate<
  Omit<TelemetryPointRow, "id">,
  {
    where: { tenantId: string; vehicleId: string };
    orderBy?: { timestamp: "desc" | "asc" };
    take?: number;
  },
  TelemetryPointRow
> & {
  findUnique(args: {
    where: { tenantId_vehicleId_timestamp: { tenantId: string; vehicleId: string; timestamp: Date } };
  }): Promise<TelemetryPointRow | null>;
};

type TripDelegate = Delegate<
  Omit<TripRow, "id" | "createdAt">,
  { where: { tenantId: string; vehicleId: string }; orderBy?: { startTime: "desc" | "asc" } },
  TripRow
>;

type FuelDelegate = Delegate<
  Omit<FuelReadingRow, "id" | "createdAt">,
  { where: { tenantId: string; vehicleId: string }; orderBy?: { timestamp: "desc" | "asc" } },
  FuelReadingRow
>;

type MaintenanceDelegate = Delegate<
  Omit<MaintenanceRecordRow, "id" | "createdAt" | "updatedAt">,
  { where: { tenantId: string; status?: { in: Array<"scheduled" | "in_progress"> } } },
  MaintenanceRecordRow
>;

type InsightDelegate = Delegate<
  Omit<InsightRow, "id" | "createdAt" | "metrics"> & { metrics: { createMany: { data: InsightMetricRow[] } } },
  {
    where: { tenantId: string };
    include: { metrics: true };
    orderBy?: { createdAt: "desc" | "asc" };
    take?: number;
  },
  InsightRow
> & {
  create(args: {
    data: Omit<InsightRow, "id" | "createdAt" | "metrics"> & { metrics: { createMany: { data: InsightMetricRow[] } } };
    include: { metrics: true };
  }): Promise<InsightRow>;
};

type ConversationDelegate = {
  create(args: { data: { tenantId: string; subject?: string } }): Promise<ConversationRow>;
  findFirst(args: { where: { id: string; tenantId: string } }): Promise<ConversationRow | null>;
  update(args: { where: { id: string }; data: { updatedAt: Date } }): Promise<ConversationRow>;
};

type ConversationMessageDelegate = Delegate<
  Omit<ConversationMessage, "id" | "createdAt">,
  {
    where: { tenantId: string; conversationId: string };
    orderBy?: { createdAt: "desc" | "asc" };
  },
  ConversationMessageRow
>;

type IntegrationSyncStateRow = {
  tenantId: string;
  connector: string;
  cursor: string | null;
  lastSyncedAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
};

type IntegrationSyncStateDelegate = {
  findUnique(args: { where: { tenantId_connector: { tenantId: string; connector: string } } }): Promise<IntegrationSyncStateRow | null>;
  upsert(args: {
    where: { tenantId_connector: { tenantId: string; connector: string } };
    create: IntegrationSyncStateRow & { updatedAt?: Date };
    update: Partial<IntegrationSyncStateRow>;
  }): Promise<IntegrationSyncStateRow>;
};

type TenantRateCardRow = {
  tenantId: string;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency: string;
  sourceContractId?: string | null;
};

type TenantBillingContractRow = {
  id: string;
  tenantId: string;
  name: string;
  externalJobId: string | null;
  revenuePerKm: number;
  operatingCostPerKm: number;
  currency: string;
  isActive: boolean;
  effectiveFrom: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FleetMetricDailyRowDb = {
  tenantId: string;
  vehicleId: string;
  date: Date;
  revenue: number;
  operatingCost: number;
  fuelCost: number;
  distanceKm: number;
  tripCount: number;
  idleRatioPct: number;
  utilizationPct: number;
};

type TenantRateCardDelegate = {
  findUnique(args: { where: { tenantId: string } }): Promise<TenantRateCardRow | null>;
  upsert(args: {
    where: { tenantId: string };
    create: TenantRateCardRow;
    update: Partial<Omit<TenantRateCardRow, "tenantId">>;
  }): Promise<TenantRateCardRow>;
};

type TenantBillingContractDelegate = {
  findMany(args: {
    where: { tenantId: string };
    orderBy?: { createdAt: "desc" };
  }): Promise<TenantBillingContractRow[]>;
  findFirst(args: { where: { tenantId: string; id?: string; isActive?: boolean } }): Promise<TenantBillingContractRow | null>;
  create(args: { data: Omit<TenantBillingContractRow, "id" | "createdAt" | "updatedAt"> & { id?: string } }): Promise<TenantBillingContractRow>;
  updateMany(args: {
    where: { tenantId: string; isActive?: boolean };
    data: Partial<Pick<TenantBillingContractRow, "isActive" | "effectiveFrom">>;
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: string };
    data: Partial<Pick<TenantBillingContractRow, "isActive" | "effectiveFrom">>;
  }): Promise<TenantBillingContractRow>;
};

type FleetMetricDailyDelegate = {
  findMany(args: {
    where: { tenantId: string; date?: { gte?: Date; lte?: Date } };
    orderBy?: { date: "asc" | "desc" };
  }): Promise<FleetMetricDailyRowDb[]>;
  upsert(args: {
    where: { tenantId_vehicleId_date: { tenantId: string; vehicleId: string; date: Date } };
    create: FleetMetricDailyRowDb;
    update: Omit<FleetMetricDailyRowDb, "tenantId" | "vehicleId" | "date">;
  }): Promise<FleetMetricDailyRowDb>;
};

type ForecastEvaluationDelegate = {
  create(args: {
    data: {
      tenantId: string;
      metricKey: string;
      algorithm: string;
      trainedUntil: Date;
      horizonDays: number;
      mae: number;
      maePct: number;
      withinBandPct: number;
      sampleSize: number;
    };
  }): Promise<unknown>;
};

type PredictionPointRowDb = {
  id: string;
  runId: string;
  tenantId: string;
  date: Date;
  p10: number;
  p50: number;
  p90: number;
};

type PredictionRunRowDb = {
  id: string;
  tenantId: string;
  scopeType: "fleet" | "segment";
  scopeKey: string;
  nameIncludes: string | null;
  metricKey: string;
  algorithm: string;
  trainedUntil: Date;
  horizonDays: number;
  sampleSize: number;
  backtestMapePct: number | null;
  championSelected: boolean;
  explanationJson: string;
  createdAt: Date;
  points: PredictionPointRowDb[];
};

type PredictionRunDelegate = {
  deleteMany(args: {
    where: {
      tenantId: string;
      scopeType?: "fleet" | "segment" | "vehicle";
      scopeKey?: string;
      metricKey?: string;
      horizonDays?: number;
    };
  }): Promise<{ count: number }>;
  create(args: {
    data: {
      tenantId: string;
      scopeType: "fleet" | "segment" | "vehicle";
      scopeKey: string;
      nameIncludes: string | null;
      metricKey: string;
      algorithm: string;
      trainedUntil: Date;
      horizonDays: number;
      sampleSize: number;
      backtestMapePct: number | null;
      championSelected: boolean;
      explanationJson: string;
      points: {
        create: Array<{
          tenantId: string;
          date: Date;
          p10: number;
          p50: number;
          p90: number;
        }>;
      };
    };
  }): Promise<PredictionRunRowDb>;
  findMany(args: {
    where: {
      tenantId: string;
      horizonDays: number;
      scopeType?: "fleet" | "segment" | "vehicle";
      scopeKey?: string;
      metricKey?: string;
    };
    include: { points: { orderBy: { date: "asc" } } };
    orderBy: { createdAt: "desc" };
  }): Promise<PredictionRunRowDb[]>;
};

export interface PrismaDbClient {
  vehicle: VehicleDelegate;
  telemetryPoint: TelemetryDelegate;
  trip: TripDelegate;
  fuelReading: FuelDelegate;
  maintenanceRecord: MaintenanceDelegate;
  insight: InsightDelegate;
  conversation: ConversationDelegate;
  conversationMessage: ConversationMessageDelegate;
  integrationSyncState: IntegrationSyncStateDelegate;
  tenantRateCard: TenantRateCardDelegate;
  tenantBillingContract: TenantBillingContractDelegate;
  fleetMetricDaily: FleetMetricDailyDelegate;
  forecastEvaluation: ForecastEvaluationDelegate;
  predictionRun: PredictionRunDelegate;
  $transaction: <T>(fn: (tx: PrismaDbClient) => Promise<T>) => Promise<T>;
}

const toDateOnly = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

const mapRateCard = (row: TenantRateCardRow) => ({
  tenantId: row.tenantId,
  revenuePerKm: row.revenuePerKm,
  operatingCostPerKm: row.operatingCostPerKm,
  currency: row.currency,
  ...(row.sourceContractId ? { sourceContractId: row.sourceContractId } : {})
});

const mapBillingContract = (row: TenantBillingContractRow) => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  ...(row.externalJobId ? { externalJobId: row.externalJobId } : {}),
  revenuePerKm: row.revenuePerKm,
  operatingCostPerKm: row.operatingCostPerKm,
  currency: row.currency,
  isActive: row.isActive,
  effectiveFrom: row.effectiveFrom.toISOString(),
  ...(row.notes ? { notes: row.notes } : {}),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

const toIso = (value: Date | null | undefined): string | undefined => (value ? value.toISOString() : undefined);

const dayKey = (iso: string): string => iso.slice(0, 10);

const mapVehicle = (row: VehicleRow): Vehicle => {
  const { externalId, ...rest } = row as VehicleRow & { externalId?: string | null };
  return {
    ...rest,
    ...(externalId ? { externalId } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
};

const mapSyncState = (row: IntegrationSyncStateRow): IntegrationSyncStateRecord => ({
  tenantId: row.tenantId,
  connector: row.connector,
  ...(row.cursor ? { cursor: row.cursor } : {}),
  ...(row.lastSyncedAt ? { lastSyncedAt: row.lastSyncedAt.toISOString() } : {}),
  ...(row.lastStatus ? { lastStatus: row.lastStatus } : {}),
  ...(row.lastError ? { lastError: row.lastError } : {})
});

const mapTelemetry = (row: TelemetryPointRow): TelemetryPoint => ({
  ...row,
  timestamp: row.timestamp.toISOString()
});

const mapTrip = (row: TripRow): Trip => ({
  ...row,
  startTime: row.startTime.toISOString(),
  endTime: row.endTime.toISOString()
});

const mapFuel = (row: FuelReadingRow): FuelReading => ({
  ...row,
  timestamp: row.timestamp.toISOString()
});

const mapMaintenance = (row: MaintenanceRecordRow): MaintenanceRecord => {
  const { occurredAt: _occurredAt, dueAt: _dueAt, ...rest } = row;
  const occurredAt = toIso(row.occurredAt);
  const dueAt = toIso(row.dueAt);
  return {
    ...rest,
    ...(occurredAt ? { occurredAt } : {}),
    ...(dueAt ? { dueAt } : {})
  };
};

const mapInsight = (row: InsightRow): Insight => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  supportingMetrics: row.metrics.map((metric) => ({
    metricKey: metric.metricKey as Insight["supportingMetrics"][number]["metricKey"],
    value: metric.value,
    unit: metric.unit,
    timeframe: metric.timeframe as Insight["supportingMetrics"][number]["timeframe"],
    asOf: metric.asOf.toISOString()
  }))
});

const mapConversation = (row: ConversationRow): Conversation => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

const mapMessage = (row: ConversationMessageRow): ConversationMessage => ({
  ...row,
  createdAt: row.createdAt.toISOString()
});

type ForecastEvaluationRowDb = {
  id: string;
  tenantId: string;
  scopeType: string;
  scopeKey: string;
  metricKey: string;
  algorithm: string;
  trainedUntil: Date;
  horizonDays: number;
  evaluationKind: string;
  runId: string | null;
  mae: number;
  maePct: number;
  withinBandPct: number;
  sampleSize: number;
  createdAt: Date;
};

const mapForecastEvaluation = (row: ForecastEvaluationRowDb): ForecastEvaluationStored => ({
  id: row.id,
  tenantId: row.tenantId,
  scopeType: row.scopeType as ForecastEvaluationRecord["scopeType"],
  scopeKey: row.scopeKey,
  metricKey: row.metricKey,
  algorithm: row.algorithm,
  trainedUntil: row.trainedUntil.toISOString(),
  horizonDays: row.horizonDays,
  evaluationKind: row.evaluationKind as ForecastEvaluationKind,
  ...(row.runId ? { runId: row.runId } : {}),
  mae: row.mae,
  mapePct: row.maePct,
  withinBandPct: row.withinBandPct,
  sampleSize: row.sampleSize,
  createdAt: row.createdAt.toISOString()
});

type PredictionRunRowDb = {
  id: string;
  tenantId: string;
  scopeType: string;
  scopeKey: string;
  nameIncludes: string | null;
  metricKey: string;
  algorithm: string;
  trainedUntil: Date;
  horizonDays: number;
  sampleSize: number;
  backtestMapePct: number | null;
  championSelected: boolean;
  explanationJson: string;
  createdAt: Date;
  points: PredictionPointRowDb[];
};

const mapPredictionRun = (row: PredictionRunRowDb): PredictionRunStored => ({
  id: row.id,
  tenantId: row.tenantId,
  scopeType: row.scopeType as PredictionRunStored["scopeType"],
  scopeKey: row.scopeKey,
  ...(row.nameIncludes ? { nameIncludes: row.nameIncludes } : {}),
  metricKey: row.metricKey as PredictionRunStored["metricKey"],
  algorithm: row.algorithm,
  trainedUntil: row.trainedUntil.toISOString(),
  horizonDays: row.horizonDays,
  sampleSize: row.sampleSize,
  ...(row.backtestMapePct !== null ? { backtestMapePct: row.backtestMapePct } : {}),
  championSelected: row.championSelected,
  explanation: JSON.parse(row.explanationJson) as PredictionRunStored["explanation"],
  createdAt: row.createdAt.toISOString(),
  points: row.points.map((point) => ({
    date: point.date.toISOString().slice(0, 10),
    p10: point.p10,
    p50: point.p50,
    p90: point.p90
  }))
});

export const createPrismaTenantRepositories = (tenantId: string, db: PrismaDbClient): TenantRepositorySet => ({
  vehicles: {
    create: async (input: CreateVehicleInput): Promise<Vehicle> =>
      mapVehicle(await db.vehicle.create({ data: { tenantId, ...input } })),
    list: async (): Promise<Vehicle[]> =>
      (await db.vehicle.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } })).map(mapVehicle),
    findById: async (id: string): Promise<Vehicle | null> => {
      const row = await db.vehicle.findFirst({ where: { id, tenantId } });
      return row ? mapVehicle(row) : null;
    },
    findByExternalId: async (externalId: string): Promise<Vehicle | null> => {
      const row = await db.vehicle.findFirst({ where: { tenantId, externalId } });
      return row ? mapVehicle(row) : null;
    },
    upsertFromExternal: async (input: UpsertVehicleFromExternalInput): Promise<Vehicle> => {
      const updateData = {
        externalId: input.externalId,
        vin: input.vin,
        class: input.class,
        active: input.active ?? true,
        ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
        ...(input.make !== undefined ? { make: input.make } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.year !== undefined ? { year: input.year } : {}),
        ...(input.odometerKm !== undefined ? { odometerKm: input.odometerKm } : {})
      };

      const existingByExternal = await db.vehicle.findFirst({
        where: { tenantId, externalId: input.externalId }
      });
      if (existingByExternal) {
        const updated = await db.vehicle.update({
          where: { id: existingByExternal.id },
          data: updateData
        });
        return mapVehicle(updated);
      }

      const existingByVin = await db.vehicle.findFirst({
        where: { tenantId, vin: input.vin }
      });
      if (existingByVin) {
        const updated = await db.vehicle.update({
          where: { id: existingByVin.id },
          data: updateData
        });
        return mapVehicle(updated);
      }

      return mapVehicle(
        await db.vehicle.create({
          data: {
            tenantId,
            ...updateData
          }
        })
      );
    }
  },
  telemetry: {
    create: async (input): Promise<TelemetryPoint> => {
      const timestamp = normalizeTelemetryTimestamp(input.timestamp);
      try {
        const row = await db.telemetryPoint.create({
          data: { tenantId, ...input, timestamp }
        });
        return mapTelemetry(row);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await db.telemetryPoint.findUnique({
            where: {
              tenantId_vehicleId_timestamp: { tenantId, vehicleId: input.vehicleId, timestamp }
            }
          });
          if (existing) {
            return mapTelemetry(existing);
          }
        }
        throw error;
      }
    },
    findByVehicleAndTimestamp: async (vehicleId: string, timestamp: string): Promise<TelemetryPoint | null> => {
      const normalized = normalizeTelemetryTimestamp(timestamp);
      const row = await db.telemetryPoint.findUnique({
        where: {
          tenantId_vehicleId_timestamp: {
            tenantId,
            vehicleId,
            timestamp: normalized
          }
        }
      });
      return row ? mapTelemetry(row) : null;
    },
    listByVehicle: async (vehicleId: string, limit = 100): Promise<TelemetryPoint[]> =>
      (
        await db.telemetryPoint.findMany({
          where: { tenantId, vehicleId },
          orderBy: { timestamp: "desc" },
          take: limit
        })
      ).map(mapTelemetry)
  },
  trips: {
    create: async (input: CreateTripInput): Promise<Trip> =>
      mapTrip(
        await db.trip.create({
          data: {
            tenantId,
            ...input,
            startTime: new Date(input.startTime),
            endTime: new Date(input.endTime)
          }
        })
      ),
    listByVehicle: async (vehicleId: string): Promise<Trip[]> =>
      (await db.trip.findMany({ where: { tenantId, vehicleId }, orderBy: { startTime: "desc" } })).map(mapTrip)
  },
  fuel: {
    create: async (input: CreateFuelReadingInput): Promise<FuelReading> =>
      mapFuel(await db.fuelReading.create({ data: { tenantId, ...input, timestamp: new Date(input.timestamp) } })),
    listByVehicle: async (vehicleId: string): Promise<FuelReading[]> =>
      (await db.fuelReading.findMany({ where: { tenantId, vehicleId }, orderBy: { timestamp: "desc" } })).map(mapFuel)
  },
  maintenance: {
    create: async (input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> =>
      mapMaintenance(
        await db.maintenanceRecord.create({
          data: (({ occurredAt, dueAt, ...rest }) => ({
            tenantId,
            ...rest,
            ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
            ...(dueAt ? { dueAt: new Date(dueAt) } : {})
          }))(input)
        })
      ),
    listOpen: async (): Promise<MaintenanceRecord[]> =>
      (
        await db.maintenanceRecord.findMany({
          where: { tenantId, status: { in: ["scheduled", "in_progress"] } }
        })
      ).map(mapMaintenance)
  },
  insights: {
    create: async (input: CreateInsightInput): Promise<Insight> =>
      mapInsight(
        await db.insight.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            tenantId,
            entityType: input.entityType,
            entityId: input.entityId,
            severity: input.severity,
            title: input.title,
            description: input.description,
            recommendation: input.recommendation,
            confidence: input.confidence,
            metrics: {
              createMany: {
                data: input.supportingMetrics.map((metric) => ({
                  metricKey: metric.metricKey,
                  value: metric.value,
                  unit: metric.unit,
                  timeframe: metric.timeframe,
                  asOf: new Date(metric.asOf)
                }))
              }
            }
          },
          include: { metrics: true }
        })
      ),
    listRecent: async (limit = 20): Promise<Insight[]> =>
      (
        await db.insight.findMany({
          where: { tenantId },
          include: { metrics: true },
          orderBy: { createdAt: "desc" },
          take: limit
        })
      ).map(mapInsight),
    deleteLegacyRuleBased: async (): Promise<number> => {
      const result = await db.insight.deleteMany({
        where: {
          tenantId,
          OR: [
            { id: { startsWith: "insight_idle_" } },
            { id: { startsWith: "insight_fuel_" } },
            { id: { in: ["insight_fleet_profit", "insight_fleet_activity"] } }
          ]
        }
      });
      return result.count;
    }
  },
  conversations: {
    createConversation: async (input: CreateConversationInput): Promise<Conversation> =>
      mapConversation(await db.conversation.create({ data: { tenantId, ...input } })),
    addMessage: async (input: CreateConversationMessageInput): Promise<ConversationMessage> => {
      const conversation = await db.conversation.findFirst({
        where: { id: input.conversationId, tenantId }
      });
      if (!conversation) {
        throw new Error("Conversation not found for tenant.");
      }
      const message = await db.conversationMessage.create({
        data: { tenantId, conversationId: input.conversationId, role: input.role, content: input.content }
      });
      await db.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() }
      });
      return mapMessage(message);
    },
    listMessages: async (conversationId: string): Promise<ConversationMessage[]> =>
      (
        await db.conversationMessage.findMany({
          where: { tenantId, conversationId },
          orderBy: { createdAt: "desc" }
        })
      )
        .map(mapMessage)
        .reverse()
  },
  rateCards: {
    get: async () => {
      const row = await db.tenantRateCard.findUnique({ where: { tenantId } });
      if (row) {
        return mapRateCard(row);
      }
      return mapRateCard({
        tenantId,
        revenuePerKm: 2.1,
        operatingCostPerKm: 0.6,
        currency: "USD"
      });
    },
    upsert: async (input: UpsertTenantRateCardInput) => {
      const sourceUpdate =
        input.sourceContractId === null
          ? { sourceContractId: null }
          : input.sourceContractId
            ? { sourceContractId: input.sourceContractId }
            : {};
      const row = await db.tenantRateCard.upsert({
        where: { tenantId },
        create: {
          tenantId,
          revenuePerKm: input.revenuePerKm,
          operatingCostPerKm: input.operatingCostPerKm,
          currency: input.currency ?? "USD",
          ...("sourceContractId" in sourceUpdate ? sourceUpdate : {})
        },
        update: {
          revenuePerKm: input.revenuePerKm,
          operatingCostPerKm: input.operatingCostPerKm,
          ...(input.currency ? { currency: input.currency } : {}),
          ...sourceUpdate
        }
      });
      return mapRateCard(row);
    }
  },
  billingContracts: {
    list: async () => {
      const rows = await db.tenantBillingContract.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" }
      });
      return rows.map(mapBillingContract);
    },
    create: async (input: CreateBillingContractRecordInput) => {
      const row = await db.tenantBillingContract.create({
        data: {
          tenantId,
          name: input.name,
          externalJobId: input.externalJobId ?? null,
          revenuePerKm: input.revenuePerKm,
          operatingCostPerKm: input.operatingCostPerKm,
          currency: input.currency ?? "USD",
          isActive: false,
          notes: input.notes ?? null
        }
      });
      return mapBillingContract(row);
    },
    activate: async (contractId: string) => {
      const target = await db.tenantBillingContract.findFirst({
        where: { tenantId, id: contractId }
      });
      if (!target) {
        return null;
      }
      await db.$transaction(async (tx) => {
        await tx.tenantBillingContract.updateMany({
          where: { tenantId, isActive: true },
          data: { isActive: false }
        });
        await tx.tenantBillingContract.update({
          where: { id: contractId },
          data: { isActive: true, effectiveFrom: new Date() }
        });
      });
      const updated = await db.tenantBillingContract.findFirst({
        where: { tenantId, id: contractId }
      });
      return updated ? mapBillingContract(updated) : null;
    },
    getActive: async () => {
      const row = await db.tenantBillingContract.findFirst({
        where: { tenantId, isActive: true }
      });
      return row ? mapBillingContract(row) : null;
    }
  },
  fleetMetricDaily: {
    upsertMany: async (rows: FleetMetricDailyRow[]): Promise<void> => {
      for (const row of rows) {
        await db.fleetMetricDaily.upsert({
          where: {
            tenantId_vehicleId_date: {
              tenantId,
              vehicleId: row.vehicleId,
              date: toDateOnly(row.date)
            }
          },
          create: {
            tenantId,
            vehicleId: row.vehicleId,
            date: toDateOnly(row.date),
            revenue: row.revenue,
            operatingCost: row.operatingCost,
            fuelCost: row.fuelCost,
            distanceKm: row.distanceKm,
            tripCount: row.tripCount,
            idleRatioPct: row.idleRatioPct,
            utilizationPct: row.utilizationPct
          },
          update: {
            revenue: row.revenue,
            operatingCost: row.operatingCost,
            fuelCost: row.fuelCost,
            distanceKm: row.distanceKm,
            tripCount: row.tripCount,
            idleRatioPct: row.idleRatioPct,
            utilizationPct: row.utilizationPct
          }
        });
      }
    },
    listAggregatedByDay: async (window: { start: string; end: string }): Promise<FleetDailyAggregate[]> => {
      const rows = await db.fleetMetricDaily.findMany({
        where: {
          tenantId,
          date: { gte: toDateOnly(dayKey(window.start)), lte: toDateOnly(dayKey(window.end)) }
        },
        orderBy: { date: "asc" }
      });
      const byDay = new Map<string, FleetDailyAggregate & { fuelCost: number; distanceKm: number; samples: number }>();
      for (const row of rows) {
        const date = row.date.toISOString().slice(0, 10);
        const existing = byDay.get(date) ?? {
          date,
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
        byDay.set(date, existing);
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
  },
  forecastEvaluations: {
    upsert: async (record: ForecastEvaluationRecord): Promise<ForecastEvaluationStored> => {
      const row = await db.forecastEvaluation.upsert({
        where: {
          tenantId_scopeType_scopeKey_metricKey_horizonDays_evaluationKind_trainedUntil: {
            tenantId,
            scopeType: record.scopeType,
            scopeKey: record.scopeKey,
            metricKey: record.metricKey,
            horizonDays: record.horizonDays,
            evaluationKind: record.evaluationKind,
            trainedUntil: new Date(record.trainedUntil)
          }
        },
        create: {
          tenantId,
          scopeType: record.scopeType,
          scopeKey: record.scopeKey,
          metricKey: record.metricKey,
          algorithm: record.algorithm,
          trainedUntil: new Date(record.trainedUntil),
          horizonDays: record.horizonDays,
          evaluationKind: record.evaluationKind,
          runId: record.runId ?? null,
          mae: record.mae,
          maePct: record.mapePct,
          withinBandPct: record.withinBandPct,
          sampleSize: record.sampleSize
        },
        update: {
          algorithm: record.algorithm,
          runId: record.runId ?? null,
          mae: record.mae,
          maePct: record.mapePct,
          withinBandPct: record.withinBandPct,
          sampleSize: record.sampleSize
        }
      });
      return mapForecastEvaluation(row);
    },
    listRecent: async (query = {}): Promise<ForecastEvaluationStored[]> => {
      const rows = await db.forecastEvaluation.findMany({
        where: {
          tenantId,
          ...(query.metricKey ? { metricKey: query.metricKey } : {}),
          ...(query.scopeType ? { scopeType: query.scopeType } : {}),
          ...(query.scopeKey ? { scopeKey: query.scopeKey } : {}),
          ...(query.evaluationKind ? { evaluationKind: query.evaluationKind } : {})
        },
        orderBy: { createdAt: "desc" },
        take: query.limit ?? 30
      });
      return rows.map(mapForecastEvaluation);
    },
    listTrends: async (query = {}): Promise<ForecastEvaluationStored[]> => {
      const rows = await db.forecastEvaluation.findMany({
        where: {
          tenantId,
          ...(query.evaluationKind ? { evaluationKind: query.evaluationKind } : {})
        },
        orderBy: { createdAt: "asc" },
        take: query.limit ?? 60
      });
      return rows.map(mapForecastEvaluation);
    }
  },
  predictionRuns: {
    appendRun: async (record: PredictionRunRecord): Promise<PredictionRunStored> => {
      const row = await db.predictionRun.create({
        data: {
          tenantId,
          scopeType: record.scopeType,
          scopeKey: record.scopeKey,
          nameIncludes: record.nameIncludes ?? null,
          metricKey: record.metricKey,
          algorithm: record.algorithm,
          trainedUntil: new Date(record.trainedUntil),
          horizonDays: record.horizonDays,
          sampleSize: record.sampleSize,
          backtestMapePct: record.backtestMapePct ?? null,
          championSelected: record.championSelected,
          explanationJson: JSON.stringify(record.explanation),
          points: {
            create: record.points.map((point) => ({
              tenantId,
              date: toDateOnly(point.date),
              p10: point.p10,
              p50: point.p50,
              p90: point.p90
            }))
          }
        },
        include: { points: { orderBy: { date: "asc" } } }
      });
      return mapPredictionRun(row);
    },
    replaceRun: async (record: PredictionRunRecord): Promise<PredictionRunStored> => {
      const row = await db.predictionRun.create({
        data: {
          tenantId,
          scopeType: record.scopeType,
          scopeKey: record.scopeKey,
          nameIncludes: record.nameIncludes ?? null,
          metricKey: record.metricKey,
          algorithm: record.algorithm,
          trainedUntil: new Date(record.trainedUntil),
          horizonDays: record.horizonDays,
          sampleSize: record.sampleSize,
          backtestMapePct: record.backtestMapePct ?? null,
          championSelected: record.championSelected,
          explanationJson: JSON.stringify(record.explanation),
          points: {
            create: record.points.map((point) => ({
              tenantId,
              date: toDateOnly(point.date),
              p10: point.p10,
              p50: point.p50,
              p90: point.p90
            }))
          }
        },
        include: { points: { orderBy: { date: "asc" } } }
      });
      return mapPredictionRun(row);
    },
    pruneOldRuns: async (options = {}): Promise<number> => {
      const maxPerSeries = options.maxPerSeries ?? 24;
      const rows = await db.predictionRun.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { id: true, scopeType: true, scopeKey: true, metricKey: true, horizonDays: true, createdAt: true }
      });
      const keep = new Set<string>();
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = `${row.scopeType}:${row.scopeKey}:${row.metricKey}:${row.horizonDays}`;
        const count = counts.get(key) ?? 0;
        if (count < maxPerSeries) {
          keep.add(row.id);
          counts.set(key, count + 1);
        }
      }
      const deleteIds = rows.filter((row) => !keep.has(row.id)).map((row) => row.id);
      if (deleteIds.length === 0) {
        return 0;
      }
      const result = await db.predictionRun.deleteMany({ where: { id: { in: deleteIds } } });
      return result.count;
    },
    listMature: async (query: ListMaturePredictionRunsQuery = {}): Promise<PredictionRunStored[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db.predictionRun.findMany({
        where: {
          tenantId,
          ...(query.horizonDays ? { horizonDays: query.horizonDays } : {})
        },
        include: { points: { orderBy: { date: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: (query.limit ?? 50) * 3
      });

      const mature: PredictionRunStored[] = [];
      for (const row of rows) {
        const mapped = mapPredictionRun(row);
        const lastDate = mapped.points[mapped.points.length - 1]?.date?.slice(0, 10);
        if (lastDate && lastDate < today && mapped.points.length > 0) {
          mature.push(mapped);
        }
        if (mature.length >= (query.limit ?? 50)) {
          break;
        }
      }
      return mature;
    },
    listLatest: async (query: ListLatestPredictionRunsQuery): Promise<PredictionRunStored[]> => {
      const rows = await db.predictionRun.findMany({
        where: {
          tenantId,
          horizonDays: query.horizonDays,
          ...(query.scopeType ? { scopeType: query.scopeType } : {}),
          ...(query.scopeKey ? { scopeKey: query.scopeKey } : {}),
          ...(query.metricKey ? { metricKey: query.metricKey } : {})
        },
        include: { points: { orderBy: { date: "asc" } } },
        orderBy: { createdAt: "desc" }
      });

      const seen = new Set<string>();
      const latest: PredictionRunStored[] = [];
      for (const row of rows) {
        const key = `${row.scopeType}:${row.scopeKey}:${row.metricKey}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        latest.push(mapPredictionRun(row));
      }
      return latest;
    }
  },
  integrationSync: {
    get: async (connector: string): Promise<IntegrationSyncStateRecord | null> => {
      const row = await db.integrationSyncState.findUnique({
        where: { tenantId_connector: { tenantId, connector } }
      });
      return row ? mapSyncState(row) : null;
    },
    upsert: async (state: IntegrationSyncStateRecord): Promise<IntegrationSyncStateRecord> => {
      const row = await db.integrationSyncState.upsert({
        where: { tenantId_connector: { tenantId, connector: state.connector } },
        create: {
          tenantId,
          connector: state.connector,
          cursor: state.cursor ?? null,
          lastSyncedAt: state.lastSyncedAt ? new Date(state.lastSyncedAt) : null,
          lastStatus: state.lastStatus ?? null,
          lastError: state.lastError ?? null
        },
        update: {
          cursor: state.cursor ?? null,
          lastSyncedAt: state.lastSyncedAt ? new Date(state.lastSyncedAt) : null,
          lastStatus: state.lastStatus ?? null,
          lastError: state.lastStatus === "ok" ? null : (state.lastError ?? null)
        }
      });
      return mapSyncState(row);
    }
  }
});
