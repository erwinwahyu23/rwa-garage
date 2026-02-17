
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Inventory Reset...");

    try {
        // 1. Delete all Purchases
        const deletedPurchases = await prisma.purchase.deleteMany({});
        console.log(`Deleted ${deletedPurchases.count} purchases.`);

        // 2. Delete all Visit Items (Stock Usage)
        const deletedVisitItems = await prisma.visitItem.deleteMany({});
        console.log(`Deleted ${deletedVisitItems.count} visit items (stock usage).`);

        // 3. Delete all Inventory Audits
        const deletedAudits = await prisma.inventoryAudit.deleteMany({});
        console.log(`Deleted ${deletedAudits.count} inventory audits.`);

        // 4. Reset SparePart Stock to 0
        const updatedSpareParts = await prisma.sparePart.updateMany({
            data: {
                stock: 0,
            },
        });
        console.log(`Reset stock to 0 for ${updatedSpareParts.count} spare parts.`);

        console.log("Inventory Reset Complete.");
    } catch (error) {
        console.error("Error resetting inventory:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
