import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "tenant_demo";

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
