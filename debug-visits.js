
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const visits = await prisma.visit.findMany({
        where: {
            // Check visits from last 2 days to be sure
            createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        },
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log("Recent Visits:");
    visits.forEach(v => {
        console.log(`ID: ${v.id}`);
        console.log(`Number: ${v.visitNumber}`);
        console.log(`Vehicle: ${v.vehicle.licensePlate}`);
        console.log(`Visit Date (DB): ${v.visitDate}`);
        console.log(`Created At: ${v.createdAt}`);
        console.log(`Status: ${v.status}`);
        console.log(`-------------------`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
