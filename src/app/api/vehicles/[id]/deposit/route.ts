import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const depositSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["IN", "OUT"]),
  notes: z.string().optional()
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { amount, type, notes } = depositSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    if (type === "OUT" && vehicle.depositBalance < amount) {
      return NextResponse.json({ error: "Saldo deposit tidak mencukupi" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: {
          depositBalance: {
            [type === "IN" ? "increment" : "decrement"]: amount
          }
        }
      });

      await tx.vehicleDepositLog.create({
        data: {
          vehicleId: id,
          amount,
          type,
          notes,
          createdBy: session?.user?.name || "Admin"
        }
      });

      return v;
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin();
        const params = await props.params;
        const { id } = params;

        const logs = await prisma.vehicleDepositLog.findMany({
            where: { vehicleId: id },
            orderBy: { createdAt: "desc" }
        });

        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            select: { depositBalance: true }
        });

        return NextResponse.json({ balance: vehicle?.depositBalance || 0, logs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
