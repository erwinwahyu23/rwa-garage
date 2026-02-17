"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Calendar, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PaginationControls from "@/components/shared/PaginationControls";
import { format } from "date-fns";

type PurchaseItem = {
    id: string;
    purchaseDate: string;
    supplierRefNumber?: string | null;
    items: any[];
    sparePart: { name: string; code: string };
    quantity: number;
    costPrice: number;
    supplier?: { id: string; name: string };
};

export default function PurchaseList() {
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 25;

    const router = useRouter();

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset page on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Fetch Data
    useEffect(() => {
        let mounted = true;
        setLoading(true);

        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("pageSize", ITEMS_PER_PAGE.toString());
        if (debouncedSearch) {
            params.set("q", debouncedSearch);
        }

        fetch(`/api/inventory/purchases?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (!mounted) return;
                setPurchases(data.items || []);
                setTotalItems(data.total || 0);
            })
            .catch(err => {
                console.error(err);
                if (mounted) setPurchases([]);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [page, debouncedSearch]);

    // Grouping for Display (Client-Side Grouping of ONE page of results)
    const grouped = purchases.reduce((acc, curr) => {
        // Group Key: SupplierID + Ref 
        const ref = curr.supplierRefNumber || `NO-REF-${curr.purchaseDate?.split('T')[0]}`;
        const key = `${curr.supplier?.id || 'unknown'}-${ref}`;

        if (!acc[key]) {
            acc[key] = {
                key,
                ref: curr.supplierRefNumber || "No Reference",
                date: curr.purchaseDate,
                supplierId: curr.supplier?.id,
                supplierName: curr.supplier?.name || "Unknown Supplier",
                items: [],
                totalAmount: 0,
            };
        }
        const cost = Number(curr.costPrice) || 0;
        acc[key].items.push(curr);
        acc[key].totalAmount += cost * curr.quantity;
        return acc;
    }, {} as Record<string, { key: string; ref: string; date: string; supplierId?: string; supplierName: string; items: PurchaseItem[]; totalAmount: number }>);

    const groups = Object.values(grouped).sort((a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari transaksi (No. Ref / Supplier)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-white"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-slate-50">
                    <p className="text-gray-500">Tidak ada riwayat pembelian ditemukan.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => (
                        <Card key={group.key}>
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <span className="font-semibold text-lg">{group.ref}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{group.supplierName}</span>
                                            <span>•</span>
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{group.date ? format(new Date(group.date), "dd/MM/yyyy") : "-"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-700">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(group.totalAmount)}
                                        </div>
                                        <div className="text-xs text-gray-500">{group.items.length} Item(s)</div>
                                    </div>
                                </div>

                                {/* Items Preview & Action */}
                                <div className="mt-3 flex flex-col sm:flex-row gap-4 justify-between items-end">
                                    <div className="pl-6 border-l-2 border-gray-200 space-y-1 flex-1">
                                        {group.items.slice(0, 3).map((it, i) => (
                                            <div key={i} className="text-sm flex justify-between">
                                                <span>{it.quantity}x {it.sparePart?.name || it.sparePart?.code}</span>
                                            </div>
                                        ))}
                                        {group.items.length > 3 && (
                                            <div className="text-xs text-gray-400 italic">+ {group.items.length - 3} item lainnya...</div>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                const url = group.supplierId
                                                    ? `/inventory/purchases/edit?supplierId=${group.supplierId}&ref=${encodeURIComponent(group.ref)}`
                                                    : '#';
                                                router.push(url);
                                            }}
                                            className="bg-white"
                                        >
                                            <Edit className="w-3.5 h-3.5 mr-2" />
                                            Lihat / Edit Detail
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pagination Controls */}
                    <PaginationControls
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setPage}
                        loading={loading}
                        itemName="item"
                    />
                </div>
            )}
        </div>
    );
}
