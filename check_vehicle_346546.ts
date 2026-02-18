
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const engineNumber = "346546";
    console.log(`Searching for vehicle with engine number: ${engineNumber}`);

    const vehicle = await prisma.vehicle.findUnique({
        where: { engineNumber },
    });

    if (!vehicle) {
        console.log("Vehicle not found!");
    } else {
        console.log("Vehicle found:");
        console.log(vehicle);
        console.log(`License Plate: '${vehicle.licensePlate}'`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
