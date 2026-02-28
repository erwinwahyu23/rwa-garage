"use client";

import { useState, useEffect } from "react";
import InventoryEditDialog from "./InventoryEditDialog";
import CategoryManagerDialog from "./CategoryManagerDialog";
import { Button } from "@/components/ui/button";
import SparePartPurchasesDialog from "./SparePartPurchasesDialog";
import StockAdjustmentDialog from "./StockAdjustmentDialog";
import InventoryHistoryDialog from "./InventoryHistoryDialog";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Plus,
  Package,
  History,
  AlertTriangle,
  Edit,
  TrendingUp,
  Tags,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import PaginationControls from "@/components/shared/PaginationControls";

function SellPriceCell({ sellPrices }: { sellPrices: any[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!sellPrices || sellPrices.length === 0) {
    return <span className="text-muted-foreground text-xs italic">Belum set</span>;
  }

  const format = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  if (sellPrices.length === 1) {
    return (
      <div className="flex flex-col text-xs space-y-1">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">{sellPrices[0].brand}</span>
          <span className="font-medium">{format(sellPrices[0].price)}</span>
        </div>
      </div>
    );
  }

  const displayed = expanded ? sellPrices : sellPrices.slice(0, 1);

  return (
    <div className="flex flex-col text-xs space-y-1">
      {displayed.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-2">
          <span className="text-muted-foreground">{p.brand}</span>
          <span className="font-medium">{format(p.price)}</span>
        </div>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-[10px] text-blue-600 hover:underline text-left font-semibold flex items-center gap-1 mt-0.5"
      >
        {expanded ? "Sembunyikan" : `+${sellPrices.length - 1} harga lainnya`}
        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
    </div>
  );
}

export default function InventoryPageClient({ initialItems, completeOnly }: { initialItems?: any[]; completeOnly?: boolean }) {
  const [items, setItems] = useState<any[]>(initialItems ?? []);
  // Removed filteredItems state as we display items directly from server
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 100;

  const [editOpen, setEditOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<any | undefined>(undefined);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  // Fetch items when page or debouncedSearch changes
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedCategory && selectedCategory !== "all") params.set("categoryName", selectedCategory);
    if (completeOnly) params.set("complete", "1");
    params.set("page", page.toString());
    params.set("pageSize", PAGE_SIZE.toString());

    fetch(`/api/inventory?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setItems(data.items ?? []);
        setTotalItems(data.total ?? 0);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(String(err?.message ?? err));
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [debouncedSearch, selectedCategory, page, completeOnly]);

  // Load auxiliary data once
  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ]).then(([suppliersData, categoriesData]) => {
      setSuppliers(suppliersData || []);
      setCategories(categoriesData || []);
    }).catch(() => { });

    function onSupplierCreated() {
      fetch('/api/suppliers')
        .then((res) => res.json())
        .then((data) => setSuppliers(data || []))
        .catch(() => { });
    }

    function onCategoryCreated() {
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => setCategories(data || []))
        .catch(() => { });
    }

    window.addEventListener('supplier:created', onSupplierCreated as EventListener);
    window.addEventListener('category:created', onCategoryCreated as EventListener);

    return () => {
      window.removeEventListener('supplier:created', onSupplierCreated as EventListener);
      window.removeEventListener('category:created', onCategoryCreated as EventListener);
    };
  }, []);

  function handleUpdated(updated: any) {
    if (updated.supplierId) {
      const sup = suppliers.find((s) => s.id === updated.supplierId);
      updated.supplierName = sup?.name ?? null;
    }
    if (updated.categoryId) {
      const cat = categories.find((c) => c.id === updated.categoryId);
      updated.category = cat?.name ?? updated.category;
    }

    const newItems = items.map((r: any) => (r.id === updated.id ? updated : r));
    setItems(newItems);
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* ACTION BAR */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama barang..."
              className="pl-9 h-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-[200px]">
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
          <Button
            variant="default"
            className="flex-1 sm:flex-none"
            onClick={() => router.push('/inventory/purchases/new')}
            disabled={!isAdmin}
          >
            <Plus className="h-4 w-4 mr-2" />
            Pembelian Baru
          </Button>
          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() => router.push('/inventory/items')}
            disabled={!isAdmin}
          >
            <Package className="h-4 w-4 mr-2" />
            Daftar Item
          </Button>
          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() => setCategoryOpen(true)}
            disabled={!isAdmin}
          >
            <Tags className="h-4 w-4 mr-2" />
            Kategori
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      {/* DATA TABLE - Desktop */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="w-[120px]">Kode Barang</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Stok Fisik</TableHead>
              <TableHead>Stok Logis (Avail)</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Harga Beli (Satuan)</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow >
          </TableHeader >
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Memuat data inventory...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {items.length === 0 ? "Belum ada data stok." : "Tidak ditemukan barang yang sesuai."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((sp: any) => (
                <TableRow key={sp.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs font-medium">
                    <SparePartPurchasesDialog
                      sparePart={{ id: sp.id, code: sp.code, name: sp.name }}
                      trigger={
                        <span className="cursor-pointer hover:underline text-blue-600 flex items-center gap-1">
                          {sp.code}
                        </span>
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {sp.name}
                    {sp.stock <= sp.minStock && (
                      <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Stok Menipis</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {sp.category || "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className={`font-semibold ${sp.stock <= sp.minStock ? "text-red-600" : ""}`}>
                      {sp.stock}
                    </div>
                    <div className="text-xs text-muted-foreground">Min: {sp.minStock}</div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-semibold ${(sp.logicalStock ?? sp.stock) < 0 ? "text-red-600" : "text-green-700"}`}>
                      {sp.logicalStock ?? sp.stock}
                    </div>
                    <div className="text-xs text-muted-foreground">Tersedia</div>
                  </TableCell>
                  <TableCell>
                    {sp.unit || "Pcs"}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(sp.costPrice)}
                  </TableCell>
                  <TableCell>
                    <SellPriceCell sellPrices={sp.sellPrices} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(sp); setEditOpen(true); }} disabled={!isAdmin}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Barang
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelected(sp);
                          setHistoryOpen(true);
                        }}>
                          <History className="mr-2 h-4 w-4" /> Riwayat Pembelian & Stok
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(sp); setAdjustOpen(true); }} disabled={!isAdmin}>
                          <TrendingUp className="mr-2 h-4 w-4" /> Koreksi Stok / Opname
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table >
      </div >

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Memuat data inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Tidak ada data ditemukan.
          </div>
        ) : (
          items.map((sp: any) => (
            <div key={sp.id} className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{sp.name}</div>
                  <SparePartPurchasesDialog
                    sparePart={{ id: sp.id, code: sp.code, name: sp.name }}
                    trigger={
                      <div className="text-sm font-mono text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                        {sp.code}
                      </div>
                    }
                  />
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelected(sp); setEditOpen(true); }} disabled={!isAdmin}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Barang
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelected(sp);
                      setHistoryOpen(true);
                    }}>
                      <History className="mr-2 h-4 w-4" /> Riwayat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelected(sp); setAdjustOpen(true); }} disabled={!isAdmin}>
                      <TrendingUp className="mr-2 h-4 w-4" /> Koreksi Stok
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                  {sp.category || "Uncategorized"}
                </span>
                {sp.stock <= sp.minStock && (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 border border-red-100">
                    Stok Menipis
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t pt-2">
                <div>
                  <span className="text-muted-foreground block text-xs">Fisik / Min</span>
                  <span className={`font-semibold ${sp.stock <= sp.minStock ? "text-red-600" : ""}`}>
                    {sp.stock} <span className="text-muted-foreground font-normal">/ {sp.minStock}</span>
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Logis (Avail)</span>
                  <span className={`font-semibold ${(sp.logicalStock ?? sp.stock) < 0 ? "text-red-600" : "text-green-700"}`}>
                    {sp.logicalStock ?? sp.stock}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                <div>
                  <span className="text-muted-foreground block text-xs">Harga Beli</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(sp.costPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Harga Jual</span>
                  <SellPriceCell sellPrices={sp.sellPrices} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        loading={loading}
        itemName="item"
      />

      <InventoryEditDialog open={editOpen} onOpenChange={setEditOpen} item={selected} onUpdated={handleUpdated} />
      <CategoryManagerDialog open={categoryOpen} onOpenChange={setCategoryOpen} onUpdated={() => {
        // refresh categories if needed, though they are loaded in useEffect for search
        fetch('/api/categories').then(res => res.json()).then(setCategories).catch(() => { });
      }} />
      <StockAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        item={selected}
        onUpdated={() => {
          // refresh data
          const params = new URLSearchParams();
          if (debouncedSearch) params.set("q", debouncedSearch);
          if (selectedCategory && selectedCategory !== "all") params.set("categoryName", selectedCategory);
          if (completeOnly) params.set("complete", "1");
          params.set("page", page.toString());
          params.set("pageSize", PAGE_SIZE.toString());

          fetch(`/api/inventory?${params.toString()}`).then(res => res.json()).then(data => {
            setItems(data.items ?? []);
            setTotalItems(data.total ?? 0);
          });
        }}
      />
      <InventoryHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        sparePartId={selected?.id}
      />
    </div >
  );
}
