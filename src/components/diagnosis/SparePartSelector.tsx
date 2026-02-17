"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Combobox from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

type SparePart = {
    id: string;
    code: string;
    name: string;
    stock: number;
    unit: string;
    sellPrices?: { price: number; brand: string }[];
};

type VisitItem = {
    id?: string; // valid if already saved
    sparePartId: string;
    sparePartName: string;
    quantity: number;
    price?: number;
};

type Props = {
    items: VisitItem[];
    onChange: (items: VisitItem[]) => void;
    brand?: string; // Vehicle brand for price suggestion
    readonly?: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SparePartSelector({ items, onChange, brand, readonly = false }: Props) {
    // Fetch all inventory for now (optimization: search API)
    const { data, error, isLoading } = useSWR<{ items: SparePart[] }>("/api/inventory?complete=1&pageSize=1000", fetcher);

    const inventory = data?.items || [];

    const options = inventory.map(p => ({
        id: p.id,
        name: `${p.code} - ${p.name} (Stok: ${p.stock} ${p.unit})`
    }));

    const addItem = () => {
        onChange([
            ...items,
            { sparePartId: "", sparePartName: "", quantity: 1 }
        ]);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    const updateItem = (index: number, field: keyof VisitItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // If sparePartId changed, update name and maybe price
        if (field === "sparePartId") {
            const part = inventory.find(p => p.id === value);
            if (part) {
                item.sparePartName = part.name;
                // Autoset price based on brand?
                // simple logic: find price for this brand or default
                // For now preventing complexity, user just selects part.
            }
        }

        newItems[index] = item;
        onChange(newItems);
    };

    if (readonly) {
        return (
            <div className="space-y-2">
                <div className="font-semibold text-sm">Sparepart Digunakan:</div>
                {items.length === 0 ? <div className="text-gray-500">- Sparepart masuk ke billing -</div> : (
                    <ul className="list-disc pl-5 text-sm">
                        {items.map((it, idx) => (
                            <li key={idx}>{it.quantity}x {it.sparePartName}</li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Sparepart & Material</label>
                <Button className="bg-white" size="sm" variant="secondary" onClick={addItem} type="button">
                    <Plus className="size-4 mr-1" /> Tambah Item
                </Button>
            </div>

            {items.length === 0 && (
                <div className="text-sm text-gray-500 italic p-2 border border-dashed rounded text-center bg-white">
                    Belum ada sparepart yang dipilih
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 bg-white">
                            <Combobox
                                options={options}
                                value={item.sparePartId}
                                onChange={(val) => updateItem(index, "sparePartId", val)}
                                placeholder="Pilih Sparepart..."
                                isLoading={isLoading}
                                allowEmpty={false}
                            />
                        </div>
                        <div className="w-20 bg-white">
                            <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                placeholder="Qty"
                            />
                        </div>
                        <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => removeItem(index)}
                            title="Hapus"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
