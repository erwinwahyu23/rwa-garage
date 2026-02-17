
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getPurchaseGroup, updatePurchaseGroup } from "@/lib/inventory/service";
import * as z from "zod";

// Schema for PUT payload (subset of createPurchasesSchema)
// We rely on service validation, but good to validate basic structure
const updateSchema = z.object({
    supplierId: z.string().min(1),
    supplierRefNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    items: z.array(z.any()).min(1),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const ref = searchParams.get("ref");

    if (!supplierId || !ref) {
        return NextResponse.json({ error: "Missing supplierId or ref" }, { status: 400 });
    }

    try {
        const purchases = await getPurchaseGroup(supplierId, ref);

        // Transform to Form Shape if purchases exist
        if (purchases.length === 0) {
            return NextResponse.json({ items: [] });
        }

        const first = purchases[0];
        const result = {
            supplierId: first.supplierId,
            supplierRefNumber: first.supplierRefNumber,
            purchaseDate: first.purchaseDate,
            items: purchases.map(p => ({
                sparePartId: p.sparePartId,
                sparePartCode: p.sparePart?.code || p.sparePartCode,
                sparePartName: p.sparePart?.name || p.sparePartName,
                quantity: p.quantity,
                unitPrice: Number(p.unitPrice),
                discount: Number(p.discount),
                // discountPercent: calc... ? UI can calc
                costPrice: Number(p.costPrice),
                categoryId: p.sparePart?.categoryId,
                category: p.sparePart?.category,
            }))
        };

        return NextResponse.json(result);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const originalSupplierId = searchParams.get("supplierId");
    const originalRef = searchParams.get("ref");

    if (!originalSupplierId || !originalRef) {
        return NextResponse.json({ error: "Missing original supplierId or ref params" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const payload = updateSchema.parse(body);

        // Inject performedBy
        const itemsWithUser = payload.items.map((item: any) => ({
            ...item,
            performedBy: session.user?.name || "Unknown",
        }));

        const result = await updatePurchaseGroup(
            { supplierId: originalSupplierId, ref: originalRef },
            { ...payload, items: itemsWithUser }
        );

        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Update Purchase Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
