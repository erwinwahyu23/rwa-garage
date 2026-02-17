import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    const minimal = suppliers.map((s) => ({ id: s.id, name: s.name }));
    return NextResponse.json(minimal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
