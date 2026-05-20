import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: 'INV-190326003' },
        include: { 
            visit: {
                include: { items: true }
            }
        }
    });
    
    console.log(JSON.stringify(invoice, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
