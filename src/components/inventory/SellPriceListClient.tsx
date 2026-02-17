"use client";

import { useState } from "react";
import SellPriceCreateDialog from "@/components/inventory/SellPriceCreateDialog";
import { Button } from "@/components/ui/button";

type SellPrice = {
  id?: string;
  brand?: string;
  price?: string;
  note?: string;
  createdAt?: string | Date;
};

export default function SellPriceListClient({ sparePartId, initialPrices }: { sparePartId: string; initialPrices: SellPrice[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SellPrice[]>(initialPrices ?? []);

  async function handleCreated(item: any) {
    // normalize price to string and ensure createdAt exists
    const normalized: SellPrice = {
      ...item,
      price: item?.price ? String(item.price) : undefined,
      createdAt: item?.createdAt ?? new Date().toISOString(),
    };
    setItems((s) => [normalized, ...s]);
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button onClick={() => setOpen(true)}>Add Sell Price</Button>
      </div>

      <table className="w-full text-left">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 border-b">Brand</th>
            <th className="p-2 border-b">Price</th>
            <th className="p-2 border-b">Note</th>
            <th className="p-2 border-b">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td className="p-2 border-b" colSpan={4}>
                No sell prices
              </td>
            </tr>
          ) : (
            items.map((p, idx) => {
              const key = p.id ?? `sellprice-${idx}`;
              const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : "-";

              return (
                <tr key={key} className="bg-white hover:bg-slate-50">
                  <td className="p-2 border-b">{p.brand ?? "-"}</td>
                  <td className="p-2 border-b">{p.price ?? "-"}</td>
                  <td className="p-2 border-b">{p.note ?? "-"}</td>
                  <td className="p-2 border-b">{created}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <SellPriceCreateDialog open={open} onOpenChange={setOpen} sparePartId={sparePartId} onCreated={handleCreated} />
    </div>
  );
}
