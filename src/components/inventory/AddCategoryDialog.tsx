"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AddCategoryDialog({ onCreated }: { onCreated?: (s: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nama kategori harus diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) {
        let msg = 'Gagal menambahkan kategori';
        try {
          const json = await res.json();
          if (json?.error) msg = json.error;
        } catch (e) { }
        setError(msg);
        return;
      }
      const created = await res.json();
      setName('');
      setOpen(false);
      toast.success('Kategori ditambahkan');
      try { window.dispatchEvent(new CustomEvent('category:created', { detail: created })); } catch (e) { }
      onCreated?.(created);
    } catch (err) {
      setError('Gagal menambahkan kategori');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Tambah Kategori</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kategori</DialogTitle>
          <DialogDescription>Tambahkan kategori baru tanpa meninggalkan halaman.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Input placeholder="Nama kategori" value={name} onChange={(e) => { setName((e.target as HTMLInputElement).value); setError(null); }} />
          {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={() => { setOpen(false); setError(null); }}>Batal</Button>
          <Button onClick={handleCreate} disabled={loading || name.trim() === ""}>{loading ? 'Menyimpan...' : 'Tambah'}</Button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
