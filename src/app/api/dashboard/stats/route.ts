import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { startOfDay, startOfMonth, subMonths, format, endOfDay, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

export async function GET(req: Request) {
    try {
        await requireAuth();

        const today = new Date();
        const startDay = startOfDay(today);
        const endDay = endOfDay(today);
        const startMonth = startOfMonth(today);
        const endMonth = endOfMonth(today);

        // 1. Visits Today
        const visitsToday = await prisma.visit.count({
            where: {
                visitDate: {
                    gte: startDay,
                    lte: endDay
                }
            }
        });

        // 2. Active Jobs (ANTRI or PROSES)
        const activeJobs = await prisma.visit.count({
            where: {
                status: { in: ["ANTRI", "PROSES"] }
            }
        });

        // 3. Cancelled Jobs (Today) & (This Month)
        const cancelledToday = await prisma.visit.count({
            where: {
                status: "BATAL",
                updatedAt: { gte: startDay, lte: endDay } // Use updatedAt for cancellation time approximation
            }
        });

        const cancelledMonth = await prisma.visit.count({
            where: {
                status: "BATAL",
                updatedAt: { gte: startMonth, lte: endMonth }
            }
        });

        // 4. Monthly Visits (This Month)
        const visitsMonth = await prisma.visit.count({
            where: {
                visitDate: {
                    gte: startMonth,
                    lte: endMonth
                }
            }
        });

        // 5. Invoice Belum Dibayar:
        // A. Invoices that are UNPAID (Always count)
        // B. Invoices that are VOID (Count ONLY IF the visit has NO PAID invoice)
        const relevantInvoicesCount = await prisma.invoice.count({
            where: {
                OR: [
                    { status: "UNPAID" },
                    {
                        status: "VOID",
                        visit: {
                            invoices: {
                                none: { status: "PAID" }
                            }
                        }
                    }
                ]
            }
        });

        // C. Visit SELESAI but NO Invoice created (Status "belum ada")
        const uninvoicedVisitsCount = await prisma.visit.count({
            where: {
                status: "SELESAI",
                invoices: {
                    none: {}
                }
            }
        });

        const unpaidInvoices = relevantInvoicesCount + uninvoicedVisitsCount;

        // 6. Low Stock Items (Stock <= MinStock)
        // Prisma doesn't support comparing two columns in `where` directly easily in standard API without raw query or iterating.
        // For performance on small dataset, fetching simple list is okay. For larger, use raw query.
        // Let's use raw query for efficiency or filter in memory if list is small. 
        // Given typically < 1000 items, memory filter is fine for MVP, but let's try to be cleaner.
        // Actually, let's fetch only items where stock <= minStock if possible or just fetch all ID, stock, minStock.
        const allItems = await prisma.sparePart.findMany({
            select: { stock: true, minStock: true }
        });
        const lowStockCount = allItems.filter(i => i.stock <= i.minStock).length;


        // 7. Chart Data (Last 6 Months)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(today, i);
            const mStart = startOfMonth(date);
            const mEnd = endOfMonth(date);

            const count = await prisma.visit.count({
                where: {
                    visitDate: { gte: mStart, lte: mEnd }
                }
            });

            chartData.push({
                name: format(date, "MMM yyyy", { locale: id }),
                total: count
            });
        }

        // 8. Total Revenue (Est) This Month
        const revenueAgg = await prisma.invoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: "PAID",
                updatedAt: { gte: startMonth, lte: endMonth }
            }
        });
        const revenueMonth = revenueAgg._sum.totalAmount || 0;

        // 9. Completed Today
        const completedToday = await prisma.visit.count({
            where: {
                status: "SELESAI",
                updatedAt: { gte: startDay, lte: endDay }
            }
        });

        // 10. Recent Activities
        // Fetch recent visits and inventory audits
        const [recentVisits, recentAudits] = await Promise.all([
            prisma.visit.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: { vehicle: true, mechanic: true }
            }),
            prisma.inventoryAudit.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { sparePart: true }
            })
        ]);

        // Merge and format
        const recentActivities = [
            ...recentVisits.map(v => ({
                id: v.id,
                type: 'VISIT',
                description: `Kunjungan ${v.vehicle.brand} ${v.vehicle.model} - Status: ${v.status}`,
                user: v.mechanic?.name || 'System',
                time: v.updatedAt
            })),
            ...recentAudits.map(a => ({
                id: a.id,
                type: 'INVENTORY',
                description: `Stok ${a.sparePart.name} berubah: ${a.before} -> ${a.after} (${a.reason})`,
                user: a.performedBy || 'System',
                time: a.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5);

        return NextResponse.json({
            visitsToday,
            activeJobs,
            cancelledToday,
            cancelledMonth,
            visitsMonth,
            unpaidInvoices,
            lowStockCount,
            chartData,
            revenueMonth,
            completedToday,
            recentActivities
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
    }
}
