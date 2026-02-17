import { NextResponse } from "next/server";
import * as svc from "@/lib/inventory/service";
import { sellPriceSchema } from "@/lib/inventory/schemas";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await params as { id: string };
  const rows = await svc.listSellPrices(id);
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = sellPriceSchema.parse(body);
    const { id } = await params as { id: string };
    const created = await svc.createSellPrice(id, { ...parsed });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: err.status || 400 });
  }
}
