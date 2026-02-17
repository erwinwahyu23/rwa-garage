import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        // 1. Total Items
        const totalItems = await prisma.sparePart.count({
            where: { isDeleted: false },
        });

        // 2. Low Stock Items
        // Prisma doesn't support comparing two columns directly in `where` easily without raw query or iterating.
        // However, we can fetch items where stock <= minStock. 
        // For small datasets, fetching all checking is fine, but for larger ones we might want raw query.
        // Let's use a raw query for performance or just a filter if logical.
        // Actually, let's fetch strictly "low stock" count using database logic if possible, 
        // or just fetch all items that have minStock > 0? 
        // Let's stick to a potentially simpler JS filter for now if the dataset isn't huge, 
        // OR use raw query for "stock <= minStock".
        // "stock" and "minStock" are Int.
        /*
          SELECT COUNT(*) FROM "SparePart" WHERE "isDeleted" = false AND "stock" <= "minStock"
        */
        // For safety and strict typing let's just fetch simplified metrics or use aggregations.

        const allParts = await prisma.sparePart.findMany({
            where: { isDeleted: false },
            select: { stock: true, minStock: true, costPrice: true }
        });

        let lowStockCount = 0;
        let totalValue = 0;

        for (const part of allParts) {
            if (part.stock <= part.minStock) {
                lowStockCount++;
            }
            totalValue += part.stock * Number(part.costPrice);
        }

        // 3. Recent Activity (Audit Log or Purchases)
        // Let's grab recent purchases for now as "Recent Activity"
        const recentPurchases = await prisma.purchase.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                sparePart: { select: { name: true, code: true } },
                supplier: { select: { name: true } }
            }
        });

        return NextResponse.json({
            totalItems,
            lowStockCount,
            totalValue,
            recentPurchases
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error fetching stats" }, { status: 500 });
    }
}
