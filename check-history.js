
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Mimic the query in /api/visits/history/route.ts
    const visits = await prisma.visit.findMany({
        where: {
            vehicle: {
                engineNumber: '346546'
            }
        },
        orderBy: { createdAt: "desc" },
        include: {
            vehicle: {
                select: {
                    id: true,
                    engineNumber: true,
                    licensePlate: true,
                    brand: true,
                    model: true,
                    ownerName: true,
                    phoneNumber: true,
                },
            },
            mechanic: { select: { id: true, name: true } },
        },
        take: 1
    });

    console.log("HISTORY CHECK:");
    if (visits.length > 0) {
        console.log("VISIT FOUND:", visits[0].visitNumber);
        console.log("LICENSE PLATE:", visits[0].vehicle.licensePlate);
        console.log("FULL VEHICLE:", JSON.stringify(visits[0].vehicle, null, 2));
    } else {
        console.log("NO VISITS FOUND FOR 346546");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
