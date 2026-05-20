import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

async function main() {
    const invoice = await prisma.invoice.findFirst({
        include: { invoiceItems: true },
        orderBy: { createdAt: 'desc' }
    });
    
    // Simulate Next.js serialization
    // NextResponse.json uses JSON.stringify
    const serialized = JSON.stringify(invoice);
    const parsed = JSON.parse(serialized);
    
    console.log(parsed.invoiceItems[0]);
    console.log("Price as Number:", Number(parsed.invoiceItems[0].price));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
