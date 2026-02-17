"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface InventoryHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sparePartId?: string;
}

interface HistoryItem {
    id: string;
    date: string;
    type: "PURCHASE" | "USAGE" | "ADJUSTMENT";
    quantity: number;
    reference: string;
    details: string;
    performedBy?: string;
    balance: number;
}

export default function InventoryHistoryDialog({
    open,
    onOpenChange,
    sparePartId,
}: InventoryHistoryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [item, setItem] = useState<{ name: string; code: string; stock: number } | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (open && sparePartId) {
            setLoading(true);
            fetch(`/api/inventory/${sparePartId}/history`)
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to fetch history");
                    return res.json();
                })
                .then((data) => {
                    setItem(data.item);
                    // Set Balance Logic: Backend returns `balance` calculated
                    setHistory(data.history || []);
                })
                .catch((err) => {
                    console.error(err);
                })
                .finally(() => setLoading(false));
        }
    }, [open, sparePartId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[50vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Riwayat Stok: {item?.name} ({item?.code})</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-between text-sm bg-slate-50 p-3 rounded">
                        <div>
                            <span className="text-muted-foreground mr-2">Stok Saat Ini:</span>
                            <span className="font-bold text-lg">{item?.stock}</span>
                        </div>
                        <div>
                            {/* Could add date range filter here later */}
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-100">
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead>Masuk/Keluar</TableHead>
                                    <TableHead className="text-right">Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Memuat data...</TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Belum ada riwayat transaksi.</TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((h) => (
                                        <TableRow key={h.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">
                                                {format(new Date(h.date), "dd/MM/yyyy HH:mm", { locale: idLocale })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        h.type === "PURCHASE"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : h.type === "USAGE"
                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                                    }
                                                >
                                                    {h.type === "PURCHASE" ? "BELI" : h.type === "USAGE" ? "PAKAI" : "ADJUST"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{h.reference}</div>
                                                <div className="text-xs text-muted-foreground">{h.details}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={h.quantity > 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                                                    {h.quantity > 0 ? "+" : ""}{h.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {h.balance}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
