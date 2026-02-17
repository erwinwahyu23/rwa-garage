import { NextResponse } from "next/server";
import * as svc from "@/lib/inventory/service";
import { updateSparePartSchema } from "@/lib/inventory/schemas";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await params as { id: string };
  const sp = await svc.getSparePart(id);
  if (!sp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sp);
}

export async function PUT(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const body = await req.json();

    // Accept numeric fields sent as strings from the client (defensive)
    ['version', 'stock', 'minStock', 'costPrice'].forEach((k) => {
      if (body[k] !== undefined && typeof body[k] === 'string') {
        const n = Number(body[k]);
        if (!Number.isNaN(n)) body[k] = n;
      }
    });

    const parsed = updateSparePartSchema.parse({ ...body });
    const { id } = await params as { id: string };
    const updated = await svc.updateSparePart(id, parsed);
    return NextResponse.json(updated);
  } catch (err: any) {
    // If validation error (Zod), return details for easier debugging
    if (err && err.issues) {
      return NextResponse.json({ error: 'Validation error', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: err.status || 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params as { id: string };
    const deleted = await svc.softDeleteSparePart(id);
    return NextResponse.json({ ok: true, deletedId: deleted.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: err.status || 400 });
  }
}
