import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "tenant_demo";

  const municipalContract = await prisma.tenantBillingContract.upsert({
    where: { id: "seed_contract_municipal_sweeper" },
    update: {
      isActive: true,
      revenuePerKm: 3.2,
      operatingCostPerKm: 0.85
    },
    create: {
      id: "seed_contract_municipal_sweeper",
      tenantId,
      name: "Municipal street sweeper",
      externalJobId: "JOB-SWEEP-MUNI-2026",
      revenuePerKm: 3.2,
      operatingCostPerKm: 0.85,
      currency: "USD",
      isActive: true,
      notes: "Demo contract — rates sync to tenant rate card on activate."
    }
  });

  await prisma.tenantBillingContract.updateMany({
    where: { tenantId, id: { not: municipalContract.id } },
    data: { isActive: false }
  });

  await prisma.tenantRateCard.upsert({
    where: { tenantId },
    update: {
      revenuePerKm: municipalContract.revenuePerKm,
      operatingCostPerKm: municipalContract.operatingCostPerKm,
      currency: municipalContract.currency,
      sourceContractId: municipalContract.id
    },
    create: {
      tenantId,
      revenuePerKm: municipalContract.revenuePerKm,
      operatingCostPerKm: municipalContract.operatingCostPerKm,
      currency: municipalContract.currency,
      sourceContractId: municipalContract.id
    }
  });

  const legacyExists = await prisma.tenantBillingContract.findFirst({
    where: { tenantId, externalJobId: "JOB-DEFAULT-LEGACY" }
  });
  if (!legacyExists) {
    await prisma.tenantBillingContract.create({
      data: {
        tenantId,
        name: "Legacy default (inactive)",
        externalJobId: "JOB-DEFAULT-LEGACY",
        revenuePerKm: 2.1,
        operatingCostPerKm: 0.6,
        currency: "USD",
        isActive: false,
        notes: "Previous platform defaults for comparison."
      }
    });
  }

  const vehicle = await prisma.vehicle.upsert({
    where: {
      tenantId_vin: {
        tenantId,
        vin: "1HGBH41JXMN109186"
      }
    },
    update: {},
    create: {
      tenantId,
      vin: "1HGBH41JXMN109186",
      plateNumber: "FLEET-001",
      class: "truck",
      make: "Volvo",
      model: "FH",
      year: 2022,
      odometerKm: 150000
    }
  });

  await prisma.telemetryPoint.create({
    data: {
      tenantId,
      vehicleId: vehicle.id,
      timestamp: new Date(),
      latitude: -23.55052,
      longitude: -46.633308,
      speedKph: 62,
      source: "device"
    }
  });
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
