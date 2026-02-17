import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const adjustSchema = z.object({
    sparePartId: z.string(),
    delta: z.number().int(), // positive or negative
    reason: z.string().min(1),
    referenceId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await requireAdmin();
        const body = await req.json();
        const { sparePartId, delta, reason, referenceId } = adjustSchema.parse(body);

        if (delta === 0) {
            return NextResponse.json({ message: "Delta cannot be zero" }, { status: 400 });
        }

        const sparePart = await prisma.sparePart.findUnique({
            where: { id: sparePartId },
        });

        if (!sparePart) {
            return NextResponse.json({ message: "Spare part not found" }, { status: 404 });
        }

        const newStock = sparePart.stock + delta;

        if (newStock < 0) {
            return NextResponse.json(
                { message: "Stock cannot be negative" },
                { status: 400 }
            );
        }

        // Transaction: Update Stock + Create Audit Log
        const [updatedPart, audit] = await prisma.$transaction([
            prisma.sparePart.update({
                where: { id: sparePartId },
                data: { stock: newStock },
            }),
            prisma.inventoryAudit.create({
                data: {
                    sparePartId,
                    delta,
                    before: sparePart.stock,
                    after: newStock,
                    reason,
                    referenceId,
                    performedBy: session.user.name || session.user.email || "Admin",
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            stock: updatedPart.stock,
            audit,
        });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: err.issues }, { status: 400 });
        }
        return NextResponse.json(
            { error: err.message || "Failed to adjust stock" },
            { status: 500 }
        );
    }
}
