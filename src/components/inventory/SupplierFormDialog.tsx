"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Supplier = {
    id: string;
    name: string;
    contact?: string;
};

export default function SupplierFormDialog({
    open,
    onOpenChange,
    existingSupplier,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingSupplier?: Supplier | null;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", contact: "" });

    useEffect(() => {
        if (open) {
            if (existingSupplier) {
                setFormData({ name: existingSupplier.name, contact: existingSupplier.contact || "" });
            } else {
                setFormData({ name: "", contact: "" });
            }
        }
    }, [open, existingSupplier]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            const url = existingSupplier ? `/api/suppliers/${existingSupplier.id}` : "/api/suppliers";
            const method = existingSupplier ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal menyimpan data supplier");
            }

            toast.success(existingSupplier ? "Supplier berhasil diperbarui" : "Supplier berhasil ditambahkan");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{existingSupplier ? "Edit Supplier" : "Supplier Baru"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Supplier</Label>
                        <Input
                            id="name"
                            placeholder="PT. Maju Mundur"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact">Kontak / No. Telp (Opsional)</Label>
                        <Input
                            id="contact"
                            placeholder="08123xxx / Pak Budi"
                            value={formData.contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="destructive" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {existingSupplier ? "Simpan Perubahan" : "Simpan Supplier"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
