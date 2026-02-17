import { NextResponse } from "next/server";
import * as svc from "@/lib/inventory/service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || undefined;
    let page = Number(url.searchParams.get("page") || "1");
    let pageSize = Number(url.searchParams.get("pageSize") || "20");

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
    // cap pageSize to a reasonable maximum to prevent abuse
    pageSize = Math.min(pageSize, 200);

    const category = url.searchParams.get("category") || undefined;

    const data = await svc.listAllSpareParts({ q, page, pageSize, category });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
