import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    
    if (invoice) {
        const url = `http://localhost:3000/api/billing/invoice/${invoice.id}`;
        // Since it requires auth, we can't easily fetch it directly without a cookie.
        // Wait, the API requires auth. We can't fetch it without mocking a session.
        console.log("Invoice ID:", invoice.id);
    }
}

main().finally(() => prisma.$disconnect());
