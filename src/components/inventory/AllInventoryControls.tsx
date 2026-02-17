"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import AddSupplierDialog from "./AddSupplierDialog";
import AddCategoryDialog from "./AddCategoryDialog";

export default function AllInventoryControls() {
  return (
    <div className="flex gap-3 items-center">
      <Button asChild size="sm">
        <Link href="/inventory">Inventory (in-stock only)</Link>
      </Button>
      <div className="flex gap-2">
        <div className="hidden sm:block">
          <AddSupplierDialog />
        </div>
        <div className="hidden sm:block">
          <AddCategoryDialog />
        </div>
      </div>
    </div>
  );
}
