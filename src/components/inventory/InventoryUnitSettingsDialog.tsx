"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Plus, Edit2, Check, X, Info } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
};

type Unit = {
    id: string | null;
    name: string;
    usage: number;
    isStored: boolean;
};

export default function InventoryUnitSettingsDialog({ open, onOpenChange }: Props) {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);

    const [newUnit, setNewUnit] = useState("");
    const [adding, setAdding] = useState(false);

    const [editingName, setEditingName] = useState<string | null>(null); // key
    const [editValue, setEditValue] = useState("");

    useEffect(() => {
        if (open) {
            loadUnits();
        }
    }, [open]);

    async function loadUnits() {
        setLoading(true);
        try {
            const res = await fetch("/api/units");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUnits(data);
            }
        } catch (err) {
            toast.error("Gagal memuat satuan");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        if (!newUnit.trim()) return;

        // Client side duplicate check
        if (units.some(u => u.name.toLowerCase() === newUnit.trim().toLowerCase())) {
            toast.info("Satuan sudah ada");
            return;
        }

        setAdding(true);
        try {
            const res = await fetch("/api/units", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newUnit }),
            });

            if (!res.ok) throw new Error();

            const created = await res.json();
            // created is Unit object { id, name, ... }
            setUnits(s => [...s, { ...created, usage: 0, isStored: true }].sort((a, b) => a.name.localeCompare(b.name)));
            setNewUnit("");
            toast.success("Satuan ditambahkan");
        } catch {
            toast.error("Gagal menambah satuan");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(u: Unit) {
        if (u.usage > 0) {
            toast.error(`Satuan ini digunakan oleh ${u.usage} item. Tidak bisa dihapus.`);
            return;
        }
        if (!confirm(`Hapus satuan '${u.name}'?`)) return;

        try {
            const params = new URLSearchParams();
            if (u.id) params.set("id", u.id);
            params.set("name", u.name);

            const res = await fetch(`/api/units?${params.toString()}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal");

            setUnits(s => s.filter(x => x.name !== u.name));
            toast.success("Satuan dihapus");
        } catch (err: any) {
            toast.error(err.message || "Gagal menghapus");
        }
    }

    function startEdit(u: Unit) {
        setEditingName(u.name);
        setEditValue(u.name);
    }

    async function saveEdit(u: Unit) {
        if (!editValue.trim() || editValue === u.name) {
            setEditingName(null);
            return;
        }

        try {
            const res = await fetch("/api/units", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: u.id,
                    oldName: u.name,
                    newName: editValue
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal update");

            await loadUnits();
            setEditingName(null);
            toast.success("Satuan diubah");
        } catch (err: any) {
            toast.error(err.message || "Gagal mengubah satuan");
        }
    }

    const filtered = units.filter(u => u.name.toLowerCase().includes(newUnit.toLowerCase()));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kelola Satuan (Units)</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Cari atau tambah satuan..."
                            value={newUnit}
                            onChange={e => setNewUnit(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={adding || !newUnit}>
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah"}
                    </Button>
                </div>

                {/* LIST */}
                <div className="flex-1 overflow-y-auto border rounded-md divide-y bg-white">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                            {newUnit ? "Tidak ditemukan" : "Belum ada satuan"}
                        </p>
                    ) : (
                        filtered.map((u, i) => (
                            <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                {editingName === u.name ? (
                                    <div className="flex gap-2 flex-1 items-center">
                                        <Input
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="h-8 text-sm"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveEdit(u)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" onClick={() => setEditingName(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium flex-1">{u.name}</span>
                                        <div className="flex gap-1 items-center">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => startEdit(u)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>

                                            {u.usage > 0 ? (
                                                <div className="h-8 w-8 flex items-center justify-center" title={`Digunakan oleh ${u.usage} item`}>
                                                    <span className="text-[10px] flex items-center justify-center bg-gray-100 text-gray-400 rounded-full h-5 w-5 cursor-help">
                                                        i
                                                    </span>
                                                </div>
                                            ) : (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(u)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
