import Link from "next/link";
import { notFound } from "next/navigation";
import { getSparePart, listSellPrices } from "@/lib/inventory/service";
import SellPriceListClient from "@/components/inventory/SellPriceListClient";

export default async function Page({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  // params can be a Promise in Next.js app router streaming; unwrap it safely
  const { id } = (await params) as { id?: string };
  if (!id) return notFound();

  // load spare part with error handling
  let sp;
  try {
    sp = await getSparePart(id);
  } catch (err) {
    console.error('Error loading spare part', err);
    return <div className="p-4">Error loading spare part: {String((err as Error)?.message ?? err)}</div>;
  }

  if (!sp) return notFound();

  let sellPrices: any[] = [];
  try {
    sellPrices = await listSellPrices(id);
  } catch (err) {
    console.error('Error loading sell prices', err);
    // fall back to empty list so page still renders
    sellPrices = [];
  }

  const serialPrices = (sellPrices ?? []).map((p) => ({
    id: p.id,
    brand: p.brand,
    price: String(p.price),
    note: p.note,
    createdAt: p.createdAt,
  }));

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{sp.name} — {sp.code}</h1>
          <div className="flex gap-2">
            <Link href="/inventory" className="text-sm underline">Back</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-card/50 rounded">
            <div><strong>Category:</strong> {sp.category}</div>
            <div><strong>Stock:</strong> {sp.stock}</div>
            <div><strong>Min Stock:</strong> {sp.minStock}</div>
            <div><strong>Cost Price:</strong> {String(sp.costPrice)}</div>
            <div><strong>Version:</strong> {sp.version}</div>
          </div>

          <div className="p-4 bg-card/50 rounded">
            <h2 className="font-semibold mb-2">Sell Prices</h2>

            <SellPriceListClient sparePartId={sp.id} initialPrices={serialPrices} />
          </div>
        </div>
      </div>
    );
}
