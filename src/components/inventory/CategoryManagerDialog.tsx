"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit2, Trash2, X, Check, Save } from "lucide-react";

type Category = {
    id: string;
    name: string;
    hasItems?: boolean;
};

export default function CategoryManagerDialog({
    open,
    onOpenChange,
    onUpdated
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onUpdated?: () => void;
}) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [adding, setAdding] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        if (open) fetchCategories();
    }, [open]);

    async function fetchCategories() {
        setLoading(true);
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setCategories(data || []);
        } catch (err) {
            toast.error("Gagal memuat kategori");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        if (!newCategory.trim()) return;
        setAdding(true);
        try {
            const res = await fetch('/api/categories', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategory }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed");
            }
            const created = await res.json();

            // If server returns existing one
            const exists = categories.find(c => c.id === created.id);
            if (!exists) {
                setCategories([...categories, created]);
                toast.success("Kategori ditambahkan");
            } else {
                toast.success("Kategori sudah ada");
            }
            setNewCategory("");
            onUpdated && onUpdated();
        } catch (err: any) {
            toast.error(err.message || "Gagal menambah kategori");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Hapus kategori ini?")) return;
        try {
            const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed");
            setCategories(categories.filter(c => c.id !== id));
            toast.success("Kategori dihapus");
            onUpdated && onUpdated();
        } catch (err: any) {
            toast.error(err.message || "Gagal menghapus");
        }
    }

    async function startEdit(c: Category) {
        setEditingId(c.id);
        setEditName(c.name);
    }

    async function saveEdit() {
        if (!editingId || !editName.trim()) return;
        try {
            const res = await fetch(`/api/categories/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setCategories(categories.map(c => c.id === editingId ? { ...c, name: updated.name } : c));
            setEditingId(null);
            toast.success("Kategori diubah");
            onUpdated && onUpdated();
        } catch (err) {
            toast.error("Gagal mengubah kategori");
        }
    }

    const filtered = categories.filter(c => c.name.toLowerCase().includes(newCategory.toLowerCase()));
    const exactMatch = categories.some(c => c.name.toLowerCase() === newCategory.trim().toLowerCase());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kelola Kategori</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Cari atau tambah kategori..."
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !exactMatch && handleAdd()}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={adding || !newCategory.trim() || exactMatch}>
                        {adding ? "..." : "Tambah"}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md divide-y">
                    {loading && <div className="p-4 text-center text-sm text-gray-500">Memuat...</div>}
                    {!loading && filtered.length === 0 && newCategory && (
                        <div className="p-4 text-center text-sm text-gray-500">
                            Kategori "{newCategory}" tidak ditemukan. <br />
                            Klik <b>Tambah</b> untuk membuat baru.
                        </div>
                    )}
                    {!loading && categories.length === 0 && !newCategory && <div className="p-4 text-center text-sm text-gray-500">Belum ada kategori</div>}

                    {filtered.map((c) => (
                        <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            {editingId === c.id ? (
                                <div className="flex gap-2 flex-1 items-center">
                                    <Input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-8 text-sm"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEdit}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" onClick={() => setEditingId(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-medium flex-1">{c.name}</span>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => startEdit(c)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        {c.hasItems ? (
                                            <div className="h-8 w-8 flex items-center justify-center" title="Has items (Cannot delete)">
                                                <span className="text-[10px] items-center justify-center flex bg-gray-100 text-gray-400 rounded-full h-5 w-5 cursor-help">i</span>
                                            </div>
                                        ) : (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(c.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
