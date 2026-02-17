"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ================= TYPES ================= */

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEngineNumber?: string;
  onSuccess?: (vehicleId: string) => Promise<void> | void;
};

const EMPTY_FORM = {
  engineNumber: "",
  licensePlate: "",
  brand: "",
  model: "",
  year: "",
  ownerName: "",
  phoneNumber: "",
};

/* ================= COMPONENT ================= */

export default function VehicleCreateDialog({
  open,
  onOpenChange,
  defaultEngineNumber,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  /* ================= RESET & PREFILL ================= */
  useEffect(() => {
    if (!open) return;

    setForm({
      ...EMPTY_FORM,
      engineNumber: defaultEngineNumber ?? "",
    });
  }, [open, defaultEngineNumber]);

  /* ================= SUBMIT ================= */
  async function handleSubmit() {
    if (!form.engineNumber || !form.brand) return;

    setLoading(true);

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Gagal menambahkan kendaraan");
        return;
      }

      const vehicle = await res.json();

      // ✅ PENTING:
      // Tunggu parent (VehicleEntryDialog) membuat VISIT
      // JANGAN tutup dialog sebelum ini selesai
      if (onSuccess) {
        await onSuccess(vehicle.id);
      }

      // ✅ Tutup dialog SETELAH visit berhasil dibuat
      onOpenChange(false);
    } catch (error) {
      console.error("CREATE VEHICLE ERROR:", error);
      toast.error("Terjadi kesalahan saat menyimpan kendaraan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-3xl max-h-[90vh] overflow-y-auto space-y-3 bg-white">
        <DialogHeader>
          <DialogTitle>Tambah Kendaraan Baru</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nomor Mesin *</Label>
            <Input
              placeholder="Contoh: JM1234..."
              value={form.engineNumber}
              onChange={(e) =>
                setForm({ ...form, engineNumber: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Nomor Polisi / Plat</Label>
            <Input
              placeholder="Contoh: B 1234 XYZ"
              value={form.licensePlate}
              onChange={(e) =>
                setForm({ ...form, licensePlate: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Merk *</Label>
              <Input
                placeholder="Contoh: Honda"
                value={form.brand}
                onChange={(e) =>
                  setForm({ ...form, brand: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                placeholder="Contoh: Jazz RS"
                value={form.model}
                onChange={(e) =>
                  setForm({ ...form, model: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tahun</Label>
            <Input
              placeholder="Contoh: 2022"
              value={form.year}
              onChange={(e) =>
                setForm({ ...form, year: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Nama Pemilik</Label>
            <Input
              placeholder="Nama Pemilik"
              value={form.ownerName}
              onChange={(e) =>
                setForm({ ...form, ownerName: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>No. Handphone</Label>
            <Input
              placeholder="08123xxxx"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value })
              }
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || !form.engineNumber || !form.brand}
        >
          {loading ? "Menyimpan..." : "Simpan & Buat Kunjungan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
