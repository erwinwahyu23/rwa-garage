"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Edit, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { format } from "date-fns";


type Supplier = {
    id: string;
    name: string;
    contact?: string | null;
};

type PurchaseItem = {
    id: string;
    purchaseDate: string;
    supplierRefNumber?: string | null;
    items: any[]; // Flattened or from API
    sparePart: { name: string; code: string };
    quantity: number;
    costPrice: number; // or unitPrice/discount if available
    // ... other fields from API
};

export default function SupplierHistoryDialog({
    supplier,
    open,
    onOpenChange,
}: {
    supplier: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [purchases, setPurchases] = useState<PurchaseItem[]>([]);

    useEffect(() => {
        if (open && supplier) {
            setLoading(true);
            fetch(`/api/inventory/purchases?supplierId=${supplier.id}&pageSize=500`) // Fetch enough to group
                .then((res) => res.json())
                .then((data) => {
                    setPurchases(data.items || []);
                })
                .finally(() => setLoading(false));
        }
    }, [open, supplier]);

    // Group by Reference Number + Date (approximate "Invoice" grouping)
    const grouped = purchases.reduce((acc, curr) => {
        const key = curr.supplierRefNumber || `NO-REF-${curr.purchaseDate?.split('T')[0]}`;
        if (!acc[key]) {
            acc[key] = {
                ref: curr.supplierRefNumber || "No Reference",
                date: curr.purchaseDate,
                items: [],
                totalAmount: 0,
            };
        }
        const cost = Number(curr.costPrice) || 0; // Net cost
        acc[key].items.push(curr);
        acc[key].totalAmount += cost * curr.quantity;
        return acc;
    }, {} as Record<string, { ref: string; date: string; items: PurchaseItem[]; totalAmount: number }>);

    const groups = Object.values(grouped).sort((a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Riwayat Pembelian: {supplier?.name}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                    </div>
                ) : groups.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Belum ada riwayat pembelian.</p>
                ) : (
                    <div className="space-y-4">
                        {groups.map((group, idx) => (
                            <div key={idx} className="border rounded-md p-4 bg-gray-50/50 hover:bg-white transition-colors relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <span className="font-semibold text-lg">{group.ref !== "No Reference" ? group.ref : <span className="text-gray-400 italic">Tanpa No. Ref</span>}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {group.date ? format(new Date(group.date), "dd/MM/yyyy") : "-"}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-700">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(group.totalAmount)}
                                        </div>
                                        <div className="text-xs text-gray-500">{group.items.length} Item(s)</div>
                                    </div>
                                </div>

                                {/* Items Preview */}
                                <div className="pl-6 border-l-2 border-gray-200 space-y-1 mt-2">
                                    {group.items.slice(0, 3).map((it, i) => (
                                        <div key={i} className="text-sm flex justify-between">
                                            <span>{it.quantity}x {it.sparePart?.name}</span>
                                            <span className="text-gray-600 font-mono text-xs">
                                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(it.costPrice))}
                                            </span>
                                        </div>
                                    ))}
                                    {group.items.length > 3 && (
                                        <div className="text-xs text-gray-400 italic">+ {group.items.length - 3} item lainnya...</div>
                                    )}
                                </div>

                                {/* Action - Edit */}
                                <div className="mt-4 pt-3 border-t flex justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            if (supplier) {
                                                const encodedRef = encodeURIComponent(group.ref);
                                                router.push(`/inventory/purchases/edit?supplierId=${supplier.id}&ref=${encodedRef}`);
                                            }
                                        }}
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                        Edit / Lihat Detail
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
