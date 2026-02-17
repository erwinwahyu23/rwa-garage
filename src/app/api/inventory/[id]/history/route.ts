
import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

// Force dynamic to ensure fresh data
export const dynamic = 'force-dynamic';

// Helper to format date consistent with UI
function formatDate(date: Date) {
    return date.toISOString();
}

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sparePartId = params.id;


    try {
        // 1. Get Current Stock Info
        const sparePart = await db.sparePart.findUnique({
            where: { id: sparePartId },
            select: { stock: true, name: true, code: true }
        });

        if (!sparePart) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        // 2. Fetch Movements
        // A. Purchases (Masuk) - Use purchaseDate
        const purchases = await db.purchase.findMany({
            where: { sparePartId },
            include: { supplier: true },
            orderBy: { purchaseDate: 'desc' }
        });

        // D. Enrichment for Invoice Audits (To show Vehicle details)
        // We now RELY on Invoice Voids/Creations (via Audits) for Usage history to match Physical Stock.

        const rawAudits = await db.inventoryAudit.findMany({
            where: { sparePartId },
            orderBy: { createdAt: 'desc' }
        });

        // Extract Reference IDs and Invoice Numbers from Audits
        const auditInvoiceRefIds = new Set<string>();
        const auditInvoiceNumbers = new Set<string>();

        rawAudits.forEach(a => {
            if (a.reason.includes('Invoice') || a.referenceId) {
                if (a.referenceId) auditInvoiceRefIds.add(a.referenceId);
                const parts = a.reason.split(':');
                if (parts.length > 1) {
                    auditInvoiceNumbers.add(parts[1].trim());
                }
            }
        });

        // Fetch Invoices with Vehicle info
        const auditInvoices = await db.invoice.findMany({
            where: {
                OR: [
                    { id: { in: Array.from(auditInvoiceRefIds) } },
                    { invoiceNumber: { in: Array.from(auditInvoiceNumbers) } }
                ]
            },
            include: {
                visit: {
                    include: { vehicle: true }
                }
            }
        });

        // Create Map for quick lookup
        const invoiceMap = new Map<string, any>(); // Key: ID or InvoiceNumber -> Invoice Object
        auditInvoices.forEach(inv => {
            invoiceMap.set(inv.id, inv);
            invoiceMap.set(inv.invoiceNumber, inv);
        });

        const audits = rawAudits.filter(a => {
            // Filter Purchase Audits (redundant with purchases table)
            if (a.reason.startsWith('Purchase')) {
                return false;
            }
            // Allow all other audits (Including Invoice Created/Void)
            return true;
        });

        // 3. Combine & Normalize
        const movements = [
            ...purchases.map(p => ({
                id: p.id,
                date: p.purchaseDate,
                type: 'PURCHASE',
                quantity: p.quantity, // Positive
                reference: p.supplier?.name || "Unknown Supplier",
                details: p.supplierRefNumber ? `Ref: ${p.supplierRefNumber}` : "Restock",
                performedBy: p.createdBy
            })),
            // REMOVED: visitItems (Logical Usage) - User wants Physical Stock History only.
            ...audits.map(a => {
                const isInvoice = a.reason.includes('Invoice');
                // const isNegative = a.delta < 0; // Not needed really if we trust delta

                let type: 'USAGE' | 'ADJUSTMENT' | 'PURCHASE' = 'ADJUSTMENT';
                let reference = "Stock Opname / Koreksi";
                let details = a.reason;

                if (isInvoice) {
                    // Try to find Invoice info
                    let invoiceInfo = null;
                    if (a.referenceId && invoiceMap.has(a.referenceId)) {
                        invoiceInfo = invoiceMap.get(a.referenceId);
                    } else {
                        const parts = a.reason.split(':');
                        if (parts.length > 1) {
                            const num = parts[1].trim();
                            if (invoiceMap.has(num)) invoiceInfo = invoiceMap.get(num);
                        }
                    }

                    // Resolve Vehicle Name if Invoice Found
                    let vehicleName = "Penjualan / Invoice";
                    if (invoiceInfo && invoiceInfo.visit?.vehicle) {
                        const v = invoiceInfo.visit.vehicle;
                        vehicleName = `${v.brand} ${v.model || ""} (${v.ownerName || ""})`;
                    }

                    if (a.delta < 0) {
                        type = 'USAGE';
                        reference = vehicleName;
                        if (!details.includes(vehicleName)) {
                            // Clean up details if generic
                            const parts = a.reason.split(':');
                            if (parts.length > 1) details = `Ref: ${parts[1].trim()}`;
                        }
                    } else {
                        // Refund / Void (Positive delta)
                        type = 'PURCHASE'; // Or ADJUSTMENT? PURCHASE implies 'IN'.
                        reference = "Retur / Void Invoice";
                        const parts = a.reason.split(':');
                        if (parts.length > 1) details = `Ref: ${parts[1].trim()}`;
                    }
                }

                return {
                    id: a.id,
                    date: a.createdAt, // Audit date is strictly when the physical change happened
                    type,
                    quantity: a.delta, // Positive or Negative
                    reference,
                    details,
                    performedBy: a.performedBy
                };
            })
        ];

        // 4. Sort by Date DESC (Newest First)
        movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 5. Calculate Running Balance (Backwards from Current PHYSICAL Stock)
        // Since we now only list Physical Stock events (Purchases + Audits), current stock is the correct anchor.
        // Pending Usages (Uninvoiced) are NOT in the list, so they don't break the chain.

        let runningBalance = sparePart.stock;

        const historyWithBalance = movements.map((m) => {
            const balanceAfterThis = runningBalance;
            const snapshot = { ...m, balance: balanceAfterThis };

            // Reverse calculation for previous state
            runningBalance = runningBalance - m.quantity;
            return snapshot;
        });

        return NextResponse.json({
            item: sparePart,
            history: historyWithBalance
        });

    } catch (error: any) {
        console.error("Detailed History API Error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
