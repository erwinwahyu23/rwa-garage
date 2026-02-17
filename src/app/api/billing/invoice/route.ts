import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const createInvoiceSchema = z.object({
    visitId: z.string(),
    items: z.array(z.any()), // We store the whole snapshot
    totalAmount: z.number(),
    ppn: z.number().optional().default(0),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await requireAdmin();
        const body = await req.json();
        const { visitId, items, totalAmount, ppn, notes } = createInvoiceSchema.parse(body);

        // Check if active invoice exists
        const existing = await prisma.invoice.findFirst({
            where: {
                visitId,
                status: { not: "VOID" }
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Invoice aktif sudah ada untuk kunjungan ini." }, { status: 400 });
        }

        // Transaction: Create Invoice + Deduct Stock
        const [invoice] = await prisma.$transaction(async (tx) => {
            // 1. Generate Custom Invoice Number (Atomic Sequence)
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = String(now.getFullYear()).slice(-2);
            const prefix = `INV-${d}${m}${y}`; // e.g., INV-160226

            // Atomic Increment or Create
            const counter = await tx.systemCounter.upsert({
                where: { key: prefix },
                update: { value: { increment: 1 } },
                create: { key: prefix, value: 1 }
            });

            // Format Sequence: 001, 002, etc.
            let sequence = String(counter.value).padStart(3, '0');
            let newInvoiceNumber = `${prefix}${sequence}`;

            // SELF-HEALING: Check for collision with legacy data
            // If this number already exists (from old manual system), we must fast-forward the counter.
            const collision = await tx.invoice.findUnique({ where: { invoiceNumber: newInvoiceNumber } });

            if (collision) {
                // Find the true max invoice number for this prefix
                const lastInvoice = await tx.invoice.findFirst({
                    where: { invoiceNumber: { startsWith: prefix } },
                    orderBy: { invoiceNumber: 'desc' }
                });

                if (lastInvoice) {
                    const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(-3));
                    if (!isNaN(lastSeq)) {
                        // Bump counter to Last + 1
                        const nextVal = lastSeq + 1;
                        await tx.systemCounter.update({
                            where: { key: prefix },
                            data: { value: nextVal }
                        });

                        // Use this new safe value
                        sequence = String(nextVal).padStart(3, '0');
                        newInvoiceNumber = `${prefix}${sequence}`;
                    }
                }
            }

            // 2. Create Invoice
            const newInvoice = await tx.invoice.create({
                data: {
                    visitId,
                    invoiceNumber: newInvoiceNumber,
                    items: items as any,
                    totalAmount: totalAmount,
                    ppn: ppn,
                    status: "UNPAID",
                    notes,
                    paymentMethod: null
                }
            });

            // 3. Deduct Stock for each item IMMEDIATELY via Audit
            // Logic: Parts are installed in the car, so physical stock is reduced regardless of payment status.
            for (const item of items) {
                // Ensure we handle both structure from visitItem or direct selection
                const partId = item.sparePartId || (item.type === 'PART' ? item.id : null);

                if (partId) {
                    const qty = Number(item.qty || item.quantity || 0);
                    if (qty > 0) {
                        const part = await tx.sparePart.findUnique({ where: { id: partId } });
                        if (part) {
                            // Update Stock (Atomic Decrement)
                            await tx.sparePart.update({
                                where: { id: partId },
                                data: {
                                    stock: { decrement: qty },
                                    version: { increment: 1 }
                                }
                            });

                            // Create Audit Log
                            // Note: We use the calculated values for the log. The actual DB update is atomic.
                            const afterStock = part.stock - qty;

                            await tx.inventoryAudit.create({
                                data: {
                                    sparePartId: partId,
                                    delta: -qty,
                                    before: part.stock, // Audit must track historical state
                                    after: afterStock,
                                    reason: `Invoice Created: ${newInvoiceNumber}`, // Tag as Invoice Created
                                    referenceId: newInvoice.id,
                                    performedBy: "System" // Or session user
                                }
                            });
                        }
                    }
                }
            }

            return [newInvoice];
        });

        return NextResponse.json(invoice);
    } catch (err: any) {
        console.error("INVOICE CREATION ERROR:", err);
        return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
    }
}
