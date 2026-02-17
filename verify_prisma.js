
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking keys in prisma reference...');
    const keys = Object.keys(prisma);
    if (keys.includes('systemCounter') || 'systemCounter' in prisma) {
        console.log('SUCCESS: systemCounter found in Prisma Client.');
    } else {
        console.log('FAILURE: systemCounter NOT found in Prisma Client.');
        console.log('Available keys:', keys);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
