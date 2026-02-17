import Link from "next/link";
import InventoryPageClient from "@/components/inventory/InventoryPageClient";
import AllInventoryControls from "@/components/inventory/AllInventoryControls";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">All Inventory Items</h1>
          <p className="text-sm text-muted-foreground">Menampilkan seluruh spare part (termasuk yang belum punya stok)</p>
        </div>
        <div className="flex gap-3 items-center">
          <AllInventoryControls />
        </div>
      </div>

      <div className="mt-6">
        <InventoryPageClient />
      </div>
    </div>
  );
}
