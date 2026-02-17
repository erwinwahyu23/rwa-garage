"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Combobox from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelect: (item: any) => void;
};

export default function StockOpnameSearchDialog({ open, onOpenChange, onSelect }: Props) {
    const [items, setItems] = useState<any[]>([]);

    async function handleSearch(q: string) {
        if (!q.trim()) {
            setItems([]);
            return;
        }
        try {
            const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&page=1&pageSize=10`);
            const data = await res.json();
            setItems(data?.items ?? []);
        } catch (err) {
            console.error(err);
            setItems([]);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Cari Barang untuk Opname</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Ketik kode atau nama barang yang ingin dikoreksi stoknya.
                        </p>
                        <Combobox
                            options={items.map((i) => ({ id: i.id, name: `${i.code} - ${i.name}` }))}
                            value=""
                            onInput={handleSearch}
                            onChange={(id) => {
                                const found = items.find((i) => i.id === id);
                                if (found) {
                                    onSelect(found);
                                }
                            }}
                            placeholder="Cari barang..."
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button variant="destructive" onClick={() => onOpenChange(false)}>Batal</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
