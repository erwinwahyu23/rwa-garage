"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SellPriceCreateDialog({ open, onOpenChange, sparePartId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; sparePartId: string; onCreated?: (item: any) => void }) {
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) { setBrand(""); setPrice(0); setNote(""); } }, [open]);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${sparePartId}/sell-prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, price, note }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed');
        return;
      }
      const created = await res.json();
      onCreated && onCreated({ ...created, price: String(created.price) });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sell Price</DialogTitle>
        </DialogHeader>

        <Input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <Input placeholder="Price" type="number" value={String(price)} onChange={(e) => setPrice(Number(e.target.value))} />
        <Input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />

        <Button className="w-full" onClick={submit} disabled={loading || !brand || !price}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
