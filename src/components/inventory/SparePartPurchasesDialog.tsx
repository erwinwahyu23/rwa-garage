"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function SparePartPurchasesDialog({ sparePart, trigger }: { sparePart: { id: string; code: string; name?: string }, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/inventory/purchases?sparePartId=${sparePart.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch purchases');
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setItems(data.items ?? []);
      })
      .catch((err: any) => setError(String(err?.message ?? err)))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [open, sparePart.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <button className="underline text-primary">{sparePart.code}</button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-4xl p-4 sm:p-6 max-h-[90vh] flex flex-col min-w-0">
        <DialogHeader className="pr-8">
          <DialogTitle className="leading-tight">Pembelian: {sparePart.code} {sparePart.name ? `- ${sparePart.name}` : ''}</DialogTitle>
          <DialogDescription>Daftar pembelian untuk spare part ini.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? <p>Loading...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}

          {!loading && !error ? (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border-b">Tanggal</th>
                    <th className="p-2 border-b">Code</th>
                    <th className="p-2 border-b">Nama</th>
                    <th className="p-2 border-b">Kategori</th>
                    <th className="p-2 border-b">Jumlah</th>
                    <th className="p-2 border-b">Harga</th>
                    <th className="p-2 border-b">Supplier</th>
                    <th className="p-2 border-b">Nomor Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="bg-white hover:bg-slate-50">
                      <td className="p-2 border-b">{p.purchaseDate ? format(new Date(p.purchaseDate), "dd/MM/yyyy") : ''}</td>
                      <td className="p-2 border-b">{p.sparePart?.code ?? p.sparePartCode ?? '-'}</td>
                      <td className="p-2 border-b">{p.sparePart?.name ?? p.sparePartName ?? '-'}</td>
                      <td className="p-2 border-b">{p.sparePart?.category ?? '-'}</td>
                      <td className="p-2 border-b">{p.quantity}</td>
                      <td className="p-2 border-b">{String(p.costPrice)}</td>
                      <td className="p-2 border-b">{p.supplier?.name ?? '-'}</td>
                      <td className="p-2 border-b">{p.supplierRefNumber ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
