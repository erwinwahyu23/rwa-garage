import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await requireAuth();
        // Admin can see any, Mechanic can see own?
        // Start with simple check
        const { id } = await params;

        // Check if creating new (virtual id "create") -> but that's usually client side. 
        // This route is for fetching EXISTING invoice by ID.

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                visit: {
                    include: {
                        vehicle: true,
                        mechanic: true,
                        items: {
                            include: {
                                sparePart: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

        return NextResponse.json(invoice);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Only Admin can update properties (Pay, Void)
        await requireAuth(); // TODO: strict to Admin or Cashier
        // For now requireAuth for broad access, checking role inside if needed
        const { id } = await params;

        const body = await req.json();
        const { status, paymentMethod, notes } = body;

        const oldInvoice = await prisma.invoice.findUnique({ where: { id } });
        if (!oldInvoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

        // Status Logic
        if (status === "PAID" && oldInvoice.status !== "PAID") {
            // Payment Received. Stock was ALREADY deducted on creation. 
            // So we just update the status.

            const updatedInvoice = await prisma.invoice.update({
                where: { id },
                data: { status, paymentMethod, notes }
            });
            return NextResponse.json(updatedInvoice);

        } else if (status === "VOID" && oldInvoice.status !== "VOID") {
            // TRIGGER STOCK RETURN (Restock)
            // Stock was deducted on Creation (UNPAID) or PAID. 
            // So VOID means we must return items to stock.

            const items = oldInvoice.items as any[] || [];

            await prisma.$transaction(async (tx) => {
                await tx.invoice.update({ where: { id }, data: { status: "VOID" } });

                for (const item of items) {
                    const partId = item.sparePartId || (item.type === 'PART' ? item.id : null);

                    if (partId) {
                        const qty = Number(item.qty || item.quantity || 0);
                        if (qty > 0) {
                            const part = await tx.sparePart.findUnique({ where: { id: partId } });
                            if (part) {
                                const before = part.stock;
                                const after = before + qty;

                                await tx.sparePart.update({
                                    where: { id: partId },
                                    data: { stock: after, version: { increment: 1 } }
                                });

                                await tx.inventoryAudit.create({
                                    data: {
                                        sparePartId: partId,
                                        delta: qty,
                                        before: before,
                                        after: after,
                                        reason: `Invoice VOID (Restock): ${oldInvoice.invoiceNumber}`,
                                        referenceId: id,
                                        performedBy: "System"
                                    }
                                });
                            }
                        }
                    }
                }
            });

            const updatedInvoice = await prisma.invoice.findUnique({
                where: { id },
                include: { visit: true }
            });
            return NextResponse.json(updatedInvoice);
        }

        // Normal Update without side effects
        const invoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: status || undefined,
                paymentMethod: paymentMethod || undefined,
                notes: notes || undefined
            }
        });

        return NextResponse.json(invoice);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
    }
}
