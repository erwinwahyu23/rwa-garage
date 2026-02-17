import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import * as schemas from "@/lib/inventory/schemas";
import * as svc from "@/lib/inventory/service";

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const lowStock = url.searchParams.get("lowStock") === "1" || url.searchParams.get("lowStock") === "true";
  const complete = url.searchParams.get("complete") === "1" || url.searchParams.get("complete") === "true";
  const categoryName = url.searchParams.get("categoryName") || url.searchParams.get("category") || undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "20");

  try {
    const data = await svc.getSpareParts({ q, lowStock, page, pageSize, complete, category: categoryName });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Admin guard - uses next-auth session
    await requireAdmin();

    const body = await req.json();
    const parsed = schemas.createSparePartSchema.parse(body);
    const sp = await svc.createSparePart(parsed);
    return NextResponse.json(sp, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: err.status || 400 });
  }
}
