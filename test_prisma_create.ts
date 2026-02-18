
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const engineNumber = "TEST-ENGINE-123";
    const licensePlate = "B 1234 TEST";

    console.log(`Creating vehicle with Engine: ${engineNumber}, Plate: ${licensePlate}`);

    try {
        // CLEANUP
        await prisma.visit.deleteMany({
            where: { vehicle: { engineNumber } }
        });
        await prisma.vehicle.deleteMany({
            where: { engineNumber }
        });

        // CREATE
        const vehicle = await prisma.vehicle.create({
            data: {
                engineNumber,
                licensePlate,
                brand: "TestBrand",
                model: "TestModel",
                ownerName: "TestOwner",
                phoneNumber: "08123456789"
            }
        });

        console.log("Vehicle created:", vehicle);

        // READ BACK
        const readBack = await prisma.vehicle.findUnique({
            where: { id: vehicle.id }
        });

        console.log("Read back vehicle:", readBack);

        if (readBack?.licensePlate === licensePlate) {
            console.log("SUCCESS: License Plate persisted correctly.");
        } else {
            console.log("FAILURE: License Plate is missing or incorrect.");
        }

    } catch (e) {
        console.error("Error during test:", e);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
