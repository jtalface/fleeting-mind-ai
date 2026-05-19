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
    where: { id?: string; tenantId: string; externalId?: string };
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
>;

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
}

const toIso = (value: Date | null | undefined): string | undefined => (value ? value.toISOString() : undefined);

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
      const existing = await db.vehicle.findFirst({
        where: { tenantId, externalId: input.externalId }
      });
      if (existing) {
        const updated = await db.vehicle.update({
          where: { id: existing.id },
          data: {
            vin: input.vin,
            class: input.class,
            active: input.active ?? true,
            ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
            ...(input.make !== undefined ? { make: input.make } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.year !== undefined ? { year: input.year } : {}),
            ...(input.odometerKm !== undefined ? { odometerKm: input.odometerKm } : {})
          }
        });
        return mapVehicle(updated);
      }
      return mapVehicle(
        await db.vehicle.create({
          data: {
            tenantId,
            externalId: input.externalId,
            vin: input.vin,
            class: input.class,
            active: input.active ?? true,
            ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
            ...(input.make !== undefined ? { make: input.make } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.year !== undefined ? { year: input.year } : {}),
            ...(input.odometerKm !== undefined ? { odometerKm: input.odometerKm } : {})
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
      ).map(mapInsight)
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
