"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Package,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    ShoppingCart,
    Plus,
    User,
    ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import InventoryPageClient from "./InventoryPageClient";
import { useRouter } from "next/navigation";

import PurchaseList from "./PurchaseList";
import SupplierList from "./SupplierList";

import StockAdjustmentDialog from "./StockAdjustmentDialog";
import StockOpnameSearchDialog from "./StockOpnameSearchDialog";

export default function InventoryDashboard() {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockCount: 0,
        totalValue: 0,
        recentPurchases: [] as any[]
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const router = useRouter();

    // Stock Opname States
    const [opnameSearchOpen, setOpnameSearchOpen] = useState(false);
    const [opnameItem, setOpnameItem] = useState<any>(undefined);
    const [adjustOpen, setAdjustOpen] = useState(false);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check URL params for tab
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab) setActiveTab(tab);

        fetch("/api/inventory/stats")
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Failed to fetch stats", err))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    if (!mounted) {
        return <div className="p-6 space-y-6">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        Ringkasan stok, aset, dan aktivitas logistik.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v);
                // Optional: sync with URL
                const url = new URL(window.location.href);
                url.searchParams.set("tab", v);
                window.history.pushState({}, "", url.toString());
            }} className="w-full">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="bg-slate-100 w-fit justify-start h-auto p-1 inline-flex whitespace-nowrap">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        <TabsTrigger value="items" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Daftar Barang</TabsTrigger>
                        <TabsTrigger value="purchases" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Riwayat Pembelian</TabsTrigger>
                        <TabsTrigger value="suppliers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Daftar Supplier</TabsTrigger>
                    </TabsList>
                </div>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6 mt-4">

                    {/* STATS GRID */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Nilai Aset
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(stats.totalValue)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Estimasi nilai beli stok saat ini
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Item
                                </CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loading ? "..." : stats.totalItems}</div>
                                <p className="text-xs text-muted-foreground">
                                    Jenis barang terdaftar (SKU)
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={stats.lowStockCount > 0 ? "border-red-200 bg-red-50" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className={`text-sm font-medium ${stats.lowStockCount > 0 ? "text-red-700" : ""}`}>
                                    Stok Menipis
                                </CardTitle>
                                <AlertTriangle className={`h-4 w-4 ${stats.lowStockCount > 0 ? "text-red-600" : "text-muted-foreground"}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-red-700" : ""}`}>{loading ? "..." : stats.lowStockCount}</div>
                                <p className={`text-xs ${stats.lowStockCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                    Item di bawah batas minimum
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* RECENT ACTIVITY */}
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Aktivitas Pembelian Terakhir</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.recentPurchases.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Belum ada aktivitas pembelian.</p>
                                    ) : (
                                        stats.recentPurchases.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium leading-none">
                                                            {p.sparePart?.name || p.sparePart?.code || "Item dihapus"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {p.supplier?.name} • {format(new Date(p.createdAt), "dd/MM/yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="font-medium text-sm">
                                                    +{p.quantity} Unit
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="secondary" className="w-full text-xs" onClick={() => setActiveTab('purchases')}>
                                        Lihat Semua Transaksi
                                        <ArrowRight className="ml-2 h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* QUICK ACTIONS */}
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Jalan pintas pengelolaan inventory</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button className="w-full justify-start" onClick={() => router.push('/inventory/purchases/new')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Input Pembelian Baru
                                </Button>
                                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('items')}>
                                    <Package className="mr-2 h-4 w-4" />
                                    Kelola Master Barang
                                </Button>
                                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('suppliers')}>
                                    <User className="mr-2 h-4 w-4" />
                                    Kelola Supplier
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full justify-start text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                    onClick={() => setOpnameSearchOpen(true)}
                                >
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Stock Opname / Adjustment
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ITEMS LIST TAB */}
                <TabsContent value="items" className="mt-4">
                    <InventoryPageClient completeOnly={true} />
                </TabsContent>

                {/* PURCHASE HISTORY TAB */}
                <TabsContent value="purchases" className="mt-4">
                    <PurchaseList />
                </TabsContent>

                {/* SUPPLIER LIST TAB */}
                <TabsContent value="suppliers" className="mt-4">
                    <SupplierList />
                </TabsContent>
            </Tabs>

            <StockOpnameSearchDialog
                open={opnameSearchOpen}
                onOpenChange={setOpnameSearchOpen}
                onSelect={(item) => {
                    setOpnameItem(item);
                    setOpnameSearchOpen(false);
                    setAdjustOpen(true);
                }}
            />

            <StockAdjustmentDialog
                open={adjustOpen}
                onOpenChange={(v) => {
                    setAdjustOpen(v);
                    if (!v) {
                        // refresh stats to reflect stock change
                        fetch("/api/inventory/stats")
                            .then(res => res.json())
                            .then(data => setStats(data))
                            .catch(err => console.error("Failed to fetch stats", err));
                    }
                }}
                item={opnameItem}
            />
        </div>
    );
}
