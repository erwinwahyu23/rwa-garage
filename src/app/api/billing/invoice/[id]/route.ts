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
                invoiceItems: true,
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
        const session = await requireAuth(); // TODO: strict to Admin or Cashier
        // For now requireAuth for broad access, checking role inside if needed
        const { id } = await params;

        const body = await req.json();
        const { status, paymentMethod, notes } = body;

        const oldInvoice = await prisma.invoice.findUnique({ where: { id }, include: { invoiceItems: true, visit: true } });
        if (!oldInvoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

        // Status Logic
        if (status === "PAID" && oldInvoice.status !== "PAID") {
            // Payment Received. Stock was ALREADY deducted on creation. 
            // So we just update the status.

            const updatedInvoice = await prisma.invoice.update({
                where: { id },
                data: { status, paymentMethod, notes, paidAt: new Date() }
            });
            return NextResponse.json(updatedInvoice);

        } else if (status === "VOID" && oldInvoice.status !== "VOID") {
            // TRIGGER STOCK RETURN (Restock)
            // Stock was deducted on Creation (UNPAID) or PAID. 
            // So VOID means we must return items to stock.

            const items = oldInvoice.invoiceItems || [];

            await prisma.$transaction(async (tx) => {
                await tx.invoice.update({ where: { id }, data: { status: "VOID", paidAt: null } });

                for (const item of items) {
                    const partId = item.sparePartId;

                    if (partId) {
                        const qty = item.quantity;
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

                // Return Deposit if used
                if (oldInvoice.usedDeposit > 0 && oldInvoice.visit?.vehicleId) {
                    await tx.vehicle.update({
                        where: { id: oldInvoice.visit.vehicleId },
                        data: { depositBalance: { increment: oldInvoice.usedDeposit } }
                    });

                    await tx.vehicleDepositLog.create({
                        data: {
                            vehicleId: oldInvoice.visit.vehicleId,
                            amount: oldInvoice.usedDeposit,
                            type: "IN",
                            notes: `Pengembalian DP dari pembatalan tagihan ${oldInvoice.invoiceNumber}`,
                            referenceId: oldInvoice.id,
                            createdBy: session?.user?.name || "System"
                        }
                    });
                }
            }, {
                maxWait: 5000,
                timeout: 20000
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
