"use client";

import { useEffect, useState } from "react";
import InventoryCreateDialog from "./InventoryCreateDialog";
import InventoryEditDialog from "./InventoryEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Plus, Loader2, Edit, Trash2 } from "lucide-react";
import PaginationControls from "@/components/shared/PaginationControls";

export default function MasterItemsPageClient() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 100;

  // Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";
  const router = useRouter();

  // Load Categories
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page on category change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  // Load Items
  async function loadItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", PAGE_SIZE.toString());
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);

      const res = await fetch(`/api/inventory/all?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setItems(data.items ?? []);
      setTotalItems(data.total ?? 0);
    } catch (err: any) {
      toast.error(String(err?.message ?? "Error fetching items"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [page, debouncedSearch, selectedCategory]);

  function handleCreated(it: any) {
    // Reload to respect sort order and pagination
    loadItems();
  }

  function handleUpdated(updated: any) {
    setItems((s) => s.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDelete(id: string) {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  }

  async function performDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setConfirmDeleteOpen(false);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Unknown' }));
        toast.error(j?.error || 'Gagal menghapus item');
        return;
      }
      setItems((s) => s.filter((r) => r.id !== id));
      setTotalItems(prev => Math.max(0, prev - 1));
      toast.success('Item dihapus');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus item');
    }
  }

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Master Items</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)} disabled={!isAdmin}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama item..."
              className="pl-9 h-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Satuan</th>
                <th className="p-3">Min Stok</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading data...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Tidak ada item yang ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((sp) => (
                  <tr key={sp.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium">{sp.code}</td>
                    <td className="p-3">{sp.name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {sp.category}
                      </span>
                    </td>
                    <td className="p-3">{sp.unit || "Pcs"}</td>
                    <td className="p-3">{sp.minStock}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => { setSelected(sp); setEditOpen(true); }}
                          disabled={!isAdmin}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleDelete(sp.id)}
                          disabled={!isAdmin}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Pagination Controls */}
      <div className="mt-4">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
          loading={loading}
          itemName="item"
        />
      </div>

      <InventoryCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <InventoryEditDialog open={editOpen} onOpenChange={setEditOpen} item={selected} onUpdated={handleUpdated} minimal />
      <ConfirmationDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus Item"
        description="Apakah anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
        onConfirm={performDelete}
      />
    </div>
  );
}