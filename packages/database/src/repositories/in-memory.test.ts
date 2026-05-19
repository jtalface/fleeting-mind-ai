import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepositories } from "./in-memory.js";

describe("InMemoryTenantRepositories", () => {
  it("keeps vehicle reads tenant-scoped", async () => {
    const tenantA = createInMemoryTenantRepositories("tenant_a");
    const tenantB = createInMemoryTenantRepositories("tenant_b");

    await tenantA.vehicles.create({
      vin: "VIN-A",
      class: "truck",
      active: true
    });
    await tenantB.vehicles.create({
      vin: "VIN-B",
      class: "van",
      active: true
    });

    const vehiclesA = await tenantA.vehicles.list();
    const vehiclesB = await tenantB.vehicles.list();

    expect(vehiclesA).toHaveLength(1);
    expect(vehiclesB).toHaveLength(1);
    expect(vehiclesA[0]?.vin).toBe("VIN-A");
    expect(vehiclesB[0]?.vin).toBe("VIN-B");
  });

  it("lists only open maintenance records for tenant", async () => {
    const repos = createInMemoryTenantRepositories("tenant_a");
    const vehicle = await repos.vehicles.create({
      vin: "VIN-1",
      class: "truck",
      active: true
    });

    await repos.maintenance.create({
      vehicleId: vehicle.id,
      type: "preventive",
      status: "scheduled"
    });
    await repos.maintenance.create({
      vehicleId: vehicle.id,
      type: "repair",
      status: "completed"
    });

    const openItems = await repos.maintenance.listOpen();
    expect(openItems).toHaveLength(1);
    expect(openItems[0]?.status).toBe("scheduled");
  });

  it("updates conversation and isolates messages per tenant", async () => {
    const tenantA = createInMemoryTenantRepositories("tenant_a");
    const tenantB = createInMemoryTenantRepositories("tenant_b");

    const conversation = await tenantA.conversations.createConversation({ subject: "Driver feedback" });
    await tenantA.conversations.addMessage({
      conversationId: conversation.id,
      role: "user",
      content: "How can I reduce idle time?"
    });

    await expect(
      tenantB.conversations.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "This should fail due to tenant mismatch."
      })
    ).rejects.toThrow("Conversation not found for tenant.");
  });
});
