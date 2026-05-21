import { describe, expect, it, vi } from "vitest";
import { createPrismaTenantRepositories } from "./prisma.js";
import type { PrismaDbClient } from "./prisma.js";

describe("createPrismaTenantRepositories", () => {
  it("always injects tenantId in writes", async () => {
    const vehicleCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "veh_1",
      ...data,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z")
    }));

    const db = {
      vehicle: {
        create: vehicleCreate,
        findMany: vi.fn(async () => []),
        findFirst: vi.fn(async () => null)
      },
      telemetryPoint: { create: vi.fn(), findMany: vi.fn(async () => []) },
      trip: { create: vi.fn(), findMany: vi.fn(async () => []) },
      fuelReading: { create: vi.fn(), findMany: vi.fn(async () => []) },
      maintenanceRecord: { create: vi.fn(), findMany: vi.fn(async () => []) },
      insight: { create: vi.fn(), findMany: vi.fn(async () => []) },
      conversation: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      conversationMessage: { create: vi.fn(), findMany: vi.fn(async () => []) },
      tenantRateCard: { findUnique: vi.fn(async () => null), upsert: vi.fn() },
      fleetMetricDaily: { findMany: vi.fn(async () => []), upsert: vi.fn() },
      forecastEvaluation: { create: vi.fn() },
      integrationSyncState: { findUnique: vi.fn(), upsert: vi.fn() }
    };

    const repos = createPrismaTenantRepositories("tenant_x", db as unknown as PrismaDbClient);
    await repos.vehicles.create({
      vin: "VIN-123",
      class: "truck",
      active: true
    });

    expect(vehicleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant_x",
          vin: "VIN-123"
        })
      })
    );
  });

  it("links upsertFromExternal to an existing vehicle by vin when externalId is new", async () => {
    const seeded = {
      id: "veh_seed",
      tenantId: "tenant_x",
      vin: "VIN-EXISTING",
      class: "truck" as const,
      active: true,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z")
    };

    const vehicleUpdate = vi.fn(async () => ({
      ...seeded,
      externalId: "flespi-99",
      plateNumber: "Sweeper 7301",
      updatedAt: new Date("2026-05-08T00:00:00.000Z")
    }));

    const vehicleFindFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(seeded);

    const db = {
      vehicle: {
        create: vi.fn(),
        findMany: vi.fn(async () => []),
        findFirst: vehicleFindFirst,
        update: vehicleUpdate
      },
      telemetryPoint: { create: vi.fn(), findMany: vi.fn(async () => []) },
      trip: { create: vi.fn(), findMany: vi.fn(async () => []) },
      fuelReading: { create: vi.fn(), findMany: vi.fn(async () => []) },
      maintenanceRecord: { create: vi.fn(), findMany: vi.fn(async () => []) },
      insight: { create: vi.fn(), findMany: vi.fn(async () => []) },
      conversation: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      conversationMessage: { create: vi.fn(), findMany: vi.fn(async () => []) },
      tenantRateCard: { findUnique: vi.fn(async () => null), upsert: vi.fn() },
      fleetMetricDaily: { findMany: vi.fn(async () => []), upsert: vi.fn() },
      forecastEvaluation: { create: vi.fn() },
      integrationSyncState: { findUnique: vi.fn(), upsert: vi.fn() }
    };

    const repos = createPrismaTenantRepositories("tenant_x", db as unknown as PrismaDbClient);
    const vehicle = await repos.vehicles.upsertFromExternal({
      externalId: "flespi-99",
      vin: "VIN-EXISTING",
      plateNumber: "Sweeper 7301",
      class: "truck",
      active: true
    });

    expect(db.vehicle.create).not.toHaveBeenCalled();
    expect(vehicleUpdate).toHaveBeenCalled();
    expect(vehicle.externalId).toBe("flespi-99");
  });

  it("blocks cross-tenant conversation message writes", async () => {
    const db = {
      vehicle: { create: vi.fn(), findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
      telemetryPoint: { create: vi.fn(), findMany: vi.fn(async () => []) },
      trip: { create: vi.fn(), findMany: vi.fn(async () => []) },
      fuelReading: { create: vi.fn(), findMany: vi.fn(async () => []) },
      maintenanceRecord: { create: vi.fn(), findMany: vi.fn(async () => []) },
      insight: { create: vi.fn(), findMany: vi.fn(async () => []) },
      conversation: {
        create: vi.fn(),
        findFirst: vi.fn(async () => null),
        update: vi.fn()
      },
      conversationMessage: {
        create: vi.fn(),
        findMany: vi.fn(async () => [])
      }
    };

    const repos = createPrismaTenantRepositories("tenant_x", db as unknown as PrismaDbClient);
    await expect(
      repos.conversations.addMessage({
        conversationId: "conv_1",
        role: "assistant",
        content: "hello"
      })
    ).rejects.toThrow("Conversation not found for tenant.");
  });
});
