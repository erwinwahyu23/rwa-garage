
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const v = await prisma.vehicle.findUnique({
        where: { engineNumber: '346546' }
    });
    console.log("VEHICLE FOUND:", v ? "YES" : "NO");
    if (v) {
        console.log("LICENSE PLATE:", v.licensePlate);
        console.log("ALL DATA:", JSON.stringify(v));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
