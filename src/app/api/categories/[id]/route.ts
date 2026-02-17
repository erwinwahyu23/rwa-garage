import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const p = params as any;
    const resolved = (typeof p?.then === 'function') ? await p : p;
    const id = resolved?.id;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!body || !body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const updated = await prisma.category.update({ where: { id }, data: { name: body.name } });
    const count = await prisma.sparePart.count({ where: { categoryId: id, isDeleted: false } });
    return NextResponse.json({ id: updated.id, name: updated.name, hasItems: count > 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const p = params as any;
    const resolved = (typeof p?.then === 'function') ? await p : p;
    const id = resolved?.id;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const count = await prisma.sparePart.count({ where: { categoryId: id, isDeleted: false } });
    if (count > 0) return NextResponse.json({ error: 'Cannot delete category with items' }, { status: 400 });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
