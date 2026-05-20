import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.$queryRaw`SELECT "invoiceNumber", "items" FROM "Invoice" WHERE "items" IS NOT NULL LIMIT 2`;
    console.log(JSON.stringify(invoices, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
