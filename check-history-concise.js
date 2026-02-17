
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking history for licensePlate...");
    try {
        const visits = await prisma.visit.findMany({
            where: {
                vehicle: {
                    engineNumber: '346546'
                }
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
                vehicle: {
                    select: {
                        licensePlate: true,
                        engineNumber: true
                    }
                }
            }
        });

        if (visits.length > 0) {
            console.log(`FOUND VISIT: ${visits[0].id}`);
            console.log(`LICENSE PLATE: [${visits[0].vehicle.licensePlate}]`);
        } else {
            console.log("NO VISITS FOUND");
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
