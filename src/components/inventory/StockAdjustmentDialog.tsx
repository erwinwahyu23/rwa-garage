"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    item?: any;
    onUpdated?: () => void;
};

export default function StockAdjustmentDialog({ open, onOpenChange, item, onUpdated }: Props) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<"ADD" | "SUBTRACT">("ADD");
    const [amount, setAmount] = useState<number | "">("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) {
            setAmount("");
            setReason("");
            setType("ADD");
        }
    }, [open]);

    async function handleSubmit() {
        if (!item || !amount || Number(amount) <= 0 || !reason.trim()) return;

        setLoading(true);
        try {
            const delta = type === "ADD" ? Number(amount) : -Number(amount);

            const res = await fetch("/api/inventory/adjust", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sparePartId: item.id,
                    delta,
                    reason,
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.message || "Failed to adjust stock");
            }

            toast.success("Stok berhasil diperbarui");
            onUpdated?.();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Koreksi Stok (Stock Opname)</DialogTitle>
                </DialogHeader>

                {item && (
                    <div className="bg-slate-50 p-3 rounded-md text-sm mb-2">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-muted-foreground">{item.code}</div>
                        <div className="mt-2 flex justify-between items-center">
                            <span>Stok Saat Ini:</span>
                            <span className="font-bold text-lg">{item.stock}</span>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    {/* TYPE SELECTION */}
                    <div className="grid grid-cols-2 gap-2">
                        <div
                            onClick={() => setType("ADD")}
                            className={`cursor-pointer border rounded-md p-3 flex flex-col items-center gap-2 transition-colors ${type === 'ADD' ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-slate-50'}`}
                        >
                            <ArrowUp className="h-6 w-6" />
                            <span className="font-medium text-sm">Penambahan (+)</span>
                        </div>
                        <div
                            onClick={() => setType("SUBTRACT")}
                            className={`cursor-pointer border rounded-md p-3 flex flex-col items-center gap-2 transition-colors ${type === 'SUBTRACT' ? 'bg-red-50 border-red-500 text-red-700' : 'hover:bg-slate-50'}`}
                        >
                            <ArrowDown className="h-6 w-6" />
                            <span className="font-medium text-sm">Pengurangan (-)</span>
                        </div>
                    </div>

                    {/* AMOUNT */}
                    <div>
                        <Label>Jumlah</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="mt-1"
                        />
                    </div>

                    {/* REASON */}
                    <div>
                        <Label>Alasan (Wajib)</Label>
                        <Textarea
                            placeholder="Contoh: Barang rusak, Stok opname bulanan..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="destructive" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={loading || !amount || !reason}>
                        {loading ? "Menyimpan..." : "Simpan Koreksi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
