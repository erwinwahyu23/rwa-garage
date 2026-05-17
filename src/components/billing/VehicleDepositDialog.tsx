"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Wallet } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

export function VehicleDepositDialog() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

    const [balance, setBalance] = useState(0);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    // Search Vehicles
    useEffect(() => {
        if (!searchTerm) {
            setVehicles([]);
            return;
        }
        const timer = setTimeout(() => {
            setSearching(true);
            fetch(`/api/vehicles?search=${encodeURIComponent(searchTerm)}`)
                .then(res => res.json())
                .then(data => {
                    setVehicles(Array.isArray(data) ? data : (data.items || []));
                })
                .catch(() => setVehicles([]))
                .finally(() => setSearching(false));
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch Logs
    useEffect(() => {
        if (!selectedVehicle) return;
        setLoadingLogs(true);
        fetch(`/api/vehicles/${selectedVehicle.id}/deposit`)
            .then(res => res.json())
            .then(data => {
                setBalance(data.balance || 0);
                setLogs(data.logs || []);
            })
            .catch(err => toast.error("Gagal memuat deposit"))
            .finally(() => setLoadingLogs(false));
    }, [selectedVehicle]);

    const handleSelect = (v: any) => {
        setSelectedVehicle(v);
        setSearchTerm("");
        setVehicles([]);
        setAmount("");
        setNotes("");
    };

    const handleDeposit = async (type: "IN" | "OUT") => {
        if (!selectedVehicle) return;
        const numAmount = Number(amount);
        if (numAmount <= 0) {
            toast.error("Nominal harus lebih dari 0");
            return;
        }
        if (type === "OUT" && numAmount > balance) {
            toast.error("Saldo tidak mencukupi");
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch(`/api/vehicles/${selectedVehicle.id}/deposit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: numAmount, type, notes })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal memproses deposit");

            toast.success(`Deposit berhasil di${type === "IN" ? "tambah" : "tarik"}`);
            setAmount("");
            setNotes("");
            
            // Reload logs
            const resLogs = await fetch(`/api/vehicles/${selectedVehicle.id}/deposit`);
            const dataLogs = await resLogs.json();
            setBalance(dataLogs.balance || 0);
            setLogs(dataLogs.logs || []);
            
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" /> Deposit Kendaraan
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manajemen Deposit Kendaraan</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {!selectedVehicle ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari Nopol atau Nama Pemilik..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>

                            {vehicles.length > 0 && (
                                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                                    {vehicles.map((v: any) => (
                                        <div
                                            key={v.id}
                                            className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                            onClick={() => handleSelect(v)}
                                        >
                                            <div>
                                                <div className="font-medium">{v.licensePlate || "Tanpa Plat"}</div>
                                                <div className="text-sm text-muted-foreground">{v.brand} {v.model} - {v.ownerName}</div>
                                            </div>
                                            <Button variant="ghost" size="sm">Pilih</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-md">
                                <div>
                                    <div className="font-semibold text-lg">{selectedVehicle.licensePlate || "Tanpa Plat"}</div>
                                    <div className="text-sm text-muted-foreground">{selectedVehicle.brand} {selectedVehicle.model} - {selectedVehicle.ownerName}</div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(null)}>
                                    Ganti
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-md bg-blue-50/50">
                                    <div className="text-sm text-muted-foreground mb-1">Saldo Deposit Saat Ini</div>
                                    <div className="text-3xl font-bold text-blue-700">
                                        Rp {balance.toLocaleString("id-ID")}
                                    </div>
                                </div>

                                <div className="space-y-2 border rounded-md p-3 bg-slate-50/50">
                                    <Input
                                        type="number" step="any"
                                        placeholder="Nominal (Rp)"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Catatan (Opsional)"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button 
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                                            disabled={processing || !amount || Number(amount) <= 0}
                                            onClick={() => handleDeposit("IN")}
                                        >
                                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah (+)"}
                                        </Button>
                                        <Button 
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                                            disabled={processing || !amount || Number(amount) <= 0 || Number(amount) > balance}
                                            onClick={() => handleDeposit("OUT")}
                                        >
                                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tarik (-)"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="font-medium mb-3">Riwayat Mutasi</h4>
                                <div className="h-[200px] border rounded-md overflow-y-auto">
                                    {loadingLogs ? (
                                        <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                                    ) : logs.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-sm">Belum ada riwayat</div>
                                    ) : (
                                        <div className="divide-y">
                                            {logs.map((log: any) => (
                                                <div key={log.id} className="p-3 flex justify-between text-sm hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-medium">
                                                            {log.type === "IN" ? "Deposit Masuk" : "Deposit Keluar"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                                            {log.createdBy && ` • ${log.createdBy}`}
                                                        </div>
                                                        {log.notes && <div className="text-xs mt-1 text-slate-600">{log.notes}</div>}
                                                    </div>
                                                    <div className={`font-semibold ${log.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                                                        {log.type === "IN" ? "+" : "-"} Rp {log.amount.toLocaleString("id-ID")}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
