import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { type } = await params;
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    // Timezone-Aware Timestamps (Preferred)
    const startTs = url.searchParams.get("startTs");
    const endTs = url.searchParams.get("endTs");


    let start: Date;
    let end: Date;

    if (startTs && endTs) {
        start = new Date(startTs);
        end = new Date(endTs);
    } else if (startDate && endDate) {
        // Fallback for legacy calls
        start = new Date(startDate);
        end = new Date(endDate);
        // Adjust end date to include the whole day
        end.setHours(23, 59, 59, 999);
    } else {
        return NextResponse.json({ message: "Start/End date or startTs/endTs required" }, { status: 400 });
    }

    try {
        let data: any[] = [];

        switch (type) {
            case "visits":
                data = await prisma.visit.findMany({
                    where: {
                        visitDate: { gte: start, lte: end },
                    },
                    include: {
                        vehicle: true,
                        mechanic: { select: { name: true } }
                    },
                    orderBy: { visitDate: "asc" }
                });
                break;

            case "billing":
                data = await prisma.invoice.findMany({
                    where: {
                        createdAt: { gte: start, lte: end },
                    },
                    include: {
                        visit: {
                            include: {
                                vehicle: true,
                                mechanic: { select: { name: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                });
                break;

            case "stock":
                // 1. Fetch all SpareParts (Stok Fisik)
                const spareParts = await prisma.sparePart.findMany({
                    where: { isDeleted: false },
                    orderBy: { name: "asc" }
                });

                // 2. Fetch Pending Items (Used in visits but not yet invoiced)
                // Conditions: Visit not BATAL, and (No Invoices OR All Invoices are VOID)
                // Since stock is decremented on Invoice Creation (regardless of payment),
                // we only care if a NON-VOID invoice exists.
                const pendingItems = await prisma.visitItem.findMany({
                    where: {
                        visit: {
                            status: { not: "BATAL" },
                            invoices: {
                                none: {
                                    status: { not: "VOID" } // Exclude visits that have a valid (non-VOID) invoice
                                }
                            }
                        }
                    },
                    select: {
                        sparePartId: true,
                        quantity: true
                    }
                });

                // 3. Aggregate Pending Quantities
                const pendingMap = new Map<string, number>();
                for (const item of pendingItems) {
                    const current = pendingMap.get(item.sparePartId) || 0;
                    pendingMap.set(item.sparePartId, current + item.quantity);
                }

                // 4. Map to Report Data
                data = spareParts.map(part => {
                    const stokFisik = part.stock;
                    const pending = pendingMap.get(part.id) || 0;
                    const stokLogic = stokFisik - pending;

                    return {
                        id: part.id,
                        sparePart: part, // For compatibility with frontend accessor
                        stokFisik,
                        stokLogic,
                        createdAt: new Date() // Dummy date for table sorting if needed
                    };
                });
                break;

            case "purchases":
                data = await prisma.purchase.findMany({
                    where: {
                        purchaseDate: { gte: start, lte: end }
                    },
                    include: {
                        sparePart: true,
                        supplier: true
                    },
                    orderBy: { purchaseDate: "desc" }
                });
                break;

            default:
                return NextResponse.json({ message: "Invalid report type" }, { status: 400 });
        }

        return NextResponse.json(data);

    } catch (e: any) {
        return NextResponse.json({ message: e.message || "Error fetching report" }, { status: 500 });
    }
}
