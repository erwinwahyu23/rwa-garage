"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type VehicleFormValues = {
  engineNumber: string;
  licensePlate: string;
  brand: string;
  model: string;
  ownerName: string;
  phoneNumber: string;
};

type Props = {
  initialValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  submitLabel?: string;
};

export default function VehicleForm({
  initialValues,
  onSubmit,
  submitLabel = "Simpan Kendaraan",
}: Props) {
  const [form, setForm] = useState<VehicleFormValues>({
    engineNumber: initialValues?.engineNumber || "",
    licensePlate: initialValues?.licensePlate || "",
    brand: initialValues?.brand || "",
    model: initialValues?.model || "",
    ownerName: initialValues?.ownerName || "",
    phoneNumber: initialValues?.phoneNumber || "",
  });

  const [loading, setLoading] = useState(false);

  function update<K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.engineNumber || !form.brand) {
      toast.error("Nomor mesin dan merk wajib diisi");
      return;
    }

    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nomor Mesin *</Label>
        <Input
          placeholder="Contoh: JM12345..."
          value={form.engineNumber}
          onChange={(e) => update("engineNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Nomor Polisi / Plat</Label>
        <Input
          placeholder="Contoh: B 1234 XYZ..."
          value={form.licensePlate}
          onChange={(e) => update("licensePlate", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Merk *</Label>
        <Input
          placeholder="Contoh: Toyota, Honda..."
          value={form.brand}
          onChange={(e) => update("brand", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Input
          placeholder="Contoh: Avanza, Jazz..."
          value={form.model}
          onChange={(e) => update("model", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Nama Pemilik</Label>
        <Input
          placeholder="Nama lengkap pemilik"
          value={form.ownerName}
          onChange={(e) => update("ownerName", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>No. Telepon</Label>
        <Input
          placeholder="0812..."
          value={form.phoneNumber}
          onChange={(e) => update("phoneNumber", e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-sky-900 hover:bg-sky-800 text-white">
        {loading ? "Menyimpan..." : submitLabel}
      </Button>
    </div>
  );
}
