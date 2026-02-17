import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '100');
    const q = url.searchParams.get('q') || undefined;

    const where: any = {};
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { spareParts: { where: { isDeleted: false } } }
          }
        }
      })
    ]);

    const minimal = rows.map((r) => ({
      id: r.id,
      name: r.name,
      contact: r.contact,
      hasItems: r._count.spareParts > 0
    }));

    return NextResponse.json({ total, items: minimal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body || !body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const created = await prisma.supplier.create({ data: { name: body.name, contact: body.contact } });
    return NextResponse.json({ id: created.id, name: created.name, hasItems: false }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
