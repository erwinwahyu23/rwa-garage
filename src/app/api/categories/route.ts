import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    const minimal = await Promise.all(categories.map(async (c) => {
      const count = await prisma.sparePart.count({ where: { categoryId: c.id, isDeleted: false } });
      return { id: c.id, name: c.name, hasItems: count > 0 };
    }));
    return NextResponse.json(minimal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body || !body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const existing = await prisma.category.findFirst({
      where: { name: { equals: body.name, mode: 'insensitive' } }
    });

    if (existing) {
      // User requested checking/validation. 
      // Instead of error, we return the existing one so the UI can use it transparently (smart de-duplication).
      // Or if strictly validation error is needed:
      // return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 400 });
      // Based on "sistem akan menganggapnya sama dan menggunakan kategori yang sudah ada", we return 200.
      const count = await prisma.sparePart.count({ where: { categoryId: existing.id, isDeleted: false } });
      return NextResponse.json({ id: existing.id, name: existing.name, hasItems: count > 0 }, { status: 200 });
    }

    const created = await prisma.category.create({ data: { name: body.name } });
    return NextResponse.json({ id: created.id, name: created.name, hasItems: false }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
