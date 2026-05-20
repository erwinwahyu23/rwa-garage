import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        include: { invoiceItems: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    
    invoices.forEach(inv => {
        console.log(`${inv.invoiceNumber}: ${inv.invoiceItems.length} items`);
    });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
