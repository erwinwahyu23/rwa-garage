import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import * as schemas from "@/lib/inventory/schemas";
import * as svc from "@/lib/inventory/service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get('supplierId') || undefined;
    const sparePartId = url.searchParams.get('sparePartId') || undefined;
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '100');
    const q = url.searchParams.get('q') || undefined;

    const data = await svc.listPurchases({ supplierId, sparePartId, page, pageSize, q });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    // Batch create if items array present
    if (Array.isArray(body.items)) {
      const parsed = schemas.createPurchasesSchema.parse(body);
      const purchases = await svc.createPurchases({
        supplierId: parsed.supplierId ?? null,
        supplierRefNumber: parsed.supplierRefNumber ?? undefined,
        purchaseDate: parsed.purchaseDate ?? undefined,
        items: parsed.items.map((it) => ({
          sparePartId: it.sparePartId || undefined,
          sparePartCode: it.sparePartCode || undefined,
          sparePartName: it.sparePartName || undefined,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          costPrice: it.costPrice,

          categoryId: it.categoryId || undefined,
          category: it.category || undefined,
        })),
      });

      return NextResponse.json({ count: purchases.length, items: purchases }, { status: 201 });
    }

    const parsed = schemas.createPurchaseSchema.parse(body);
    const purchase = await svc.createPurchase({
      sparePartId: parsed.sparePartId ?? undefined,
      sparePartCode: parsed.sparePartCode ?? undefined,
      sparePartName: parsed.sparePartName ?? undefined,
      quantity: parsed.quantity,
      costPrice: parsed.costPrice,
      supplierId: parsed.supplierId ?? undefined,
      supplierRefNumber: parsed.supplierRefNumber ?? undefined,
      purchaseDate: parsed.purchaseDate ?? undefined,
      categoryId: parsed.categoryId ?? undefined,
      category: parsed.category ?? undefined,
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (err: any) {
    // Zod validation errors -> 422 with issues
    if (err?.name === 'ZodError' || err?.issues) {
      return NextResponse.json({ error: 'Validation failed', issues: err?.issues || err?.errors || err }, { status: 422 });
    }

    // Known service errors -> map to 404 or 400
    if (String(err?.message).includes('not found') || String(err?.message).includes('not exists')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json({ error: err.message || 'Bad Request' }, { status: err.status || 400 });
  }
}