
import { getPurchaseGroup } from "@/lib/inventory/service";
import PurchaseCreatePage from "@/components/inventory/PurchaseCreatePage";
import { redirect } from "next/navigation";

export default async function Page(props: {
    searchParams: Promise<{ supplierId?: string; ref?: string }>;
}) {
    const searchParams = await props.searchParams;
    const { supplierId, ref } = searchParams;

    if (!supplierId || !ref) {
        redirect("/inventory?error=MissingParams");
    }

    const purchases = await getPurchaseGroup(supplierId, ref);

    if (purchases.length === 0) {
        redirect("/inventory?error=NotFound");
    }

    const first = purchases[0];
    const initialData = {
        supplierId: first.supplierId || "",
        supplierRefNumber: first.supplierRefNumber || "",
        purchaseDate: first.purchaseDate ? first.purchaseDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        items: purchases.map(p => ({
            sparePartId: p.sparePartId || undefined,
            sparePartCode: p.sparePart?.code || p.sparePartCode || "",
            sparePartName: p.sparePart?.name || p.sparePartName || "",
            quantity: p.quantity,
            unitPrice: Number(p.unitPrice),
            discount: Number(p.discount),
            discountPercent: (Number(p.discount) && Number(p.unitPrice)) ? (Number(p.discount) / Number(p.unitPrice)) * 100 : 0,
            costPrice: Number(p.costPrice),
            categoryId: p.sparePart?.categoryId || undefined,
            category: p.sparePart?.category || (p.sparePartId ? undefined : "Uncategorized"), // If manual, might rely on stored logic
        }))
    };

    return (
        <div className="">
            <PurchaseCreatePage
                initialData={initialData}
                isEditMode={true}
                originalRef={{ supplierId, ref }}
            />
        </div>
    );
}
