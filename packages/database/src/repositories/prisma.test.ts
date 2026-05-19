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
      conversationMessage: { create: vi.fn(), findMany: vi.fn(async () => []) }
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
