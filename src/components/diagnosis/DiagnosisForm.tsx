"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

type Visit = {
  id: string;
  visitNumber: string;
  createdAt?: string;
  status: string;
  diagnosis?: string | null;
  keluhan?: string | null;
  pemeriksaan?: string | null;
  sparepart?: string | null;
  perbaikan?: string | null;
  vehicle: {
    engineNumber: string;
    licensePlate?: string | null;
    brand: string;
    model?: string | null;
    ownerName?: string | null;
  };
  mechanic?: { id?: string; name?: string } | null;
  items?: { sparePartId: string; quantity: number; sparePart: { id: string; name: string; code: string } }[];
};

type Props = {
  visit: Visit;
  onSuccess: () => void;
  readonly?: boolean;
};

import SparePartSelector from "./SparePartSelector";

export default function DiagnosisForm({
  visit,
  onSuccess,
  readonly = false,
}: Props) {
  const [form, setForm] = useState({
    keluhan: visit.keluhan ?? "",
    diagnosis: visit.diagnosis ?? "",
    pemeriksaan: visit.pemeriksaan ?? "",
    perbaikan: visit.perbaikan ?? "",
  });

  // Initialize items from visit.items or empty
  const [items, setItems] = useState<any[]>(
    visit.items?.map((i) => ({
      sparePartId: i.sparePartId,
      sparePartName: i.sparePart.name,
      quantity: i.quantity,
    })) || []
  );

  // 🔐 READ-ONLY RULE (ADMIN / SELESAI / BATAL)
  const isReadOnly =
    readonly ||
    visit.status === "SELESAI" ||
    visit.status === "BATAL";

  // ✅ HANYA DIAGNOSIS YANG WAJIB
  const isDiagnosisValid = form.diagnosis.trim() !== "";

  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSave() {
    if (isReadOnly || !isDiagnosisValid) return;

    setSaving(true);

    const res = await fetch("/api/diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitId: visit.id,
        ...form,
        items, // Send structured items
        sparepart: items.map(i => `${i.quantity}x ${i.sparePartName}`).join(", "), // Backwards compatibility: save as string too
      }),
    });

    setSaving(false);

    if (res.ok) {
      onSuccess();
    } else {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error || "Gagal menyimpan diagnosis");
    }
  }

  return (
    <div className="space-y-6">

      {/* INFO KUNJUNGAN */}
      {/* INFO KUNJUNGAN */}
      <div className="bg-slate-50 p-3 rounded-md border text-xs space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-slate-500 block">No. Visit</span>
            <span className="font-medium">{visit.visitNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Tanggal</span>
            <span className="font-medium">{visit.createdAt ? format(new Date(visit.createdAt), "dd/MM/yyyy") : '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Status</span>
            <span className="font-medium">{visit.status}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Mekanik</span>
            <span className="font-medium">{visit.mechanic?.name ?? '-'}</span>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-slate-500 block">Kendaraan</span>
            <span className="font-medium">{visit.vehicle.brand} {visit.vehicle.model ?? ""}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Mesin</span>
            <span className="font-medium font-mono">{visit.vehicle.engineNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">No. Polisi</span>
            <span className="font-medium font-mono uppercase">{visit.vehicle.licensePlate || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Pemilik</span>
            <span className="font-medium">{visit.vehicle.ownerName}</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold">
        {isReadOnly ? "Detail Diagnosis" : "Detail Diagnosis"}
      </h2>

      {/* FORM */}
      <div className="space-y-4" >
        <div className="flex flex-col gap-2">
          <Label>Keluhan Pelanggan</Label>
          <Textarea
            value={form.keluhan}
            onChange={(e) => update("keluhan", e.target.value)}
            rows={4}
            disabled={isReadOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Hasil Pemeriksaan</Label>
          <Textarea
            value={form.pemeriksaan}
            onChange={(e) => update("pemeriksaan", e.target.value)}
            rows={4}
            disabled={isReadOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Diagnosis</Label>
          <Textarea
            value={form.diagnosis}
            onChange={(e) => update("diagnosis", e.target.value)}
            rows={4}
            disabled={isReadOnly}
          />
        </div>

        {/* LOGICAL STOCK SELECTOR */}
        <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-lg border">
          <SparePartSelector
            items={items}
            onChange={setItems}
            brand={visit.vehicle.brand}
            readonly={isReadOnly}
          />
          {/* Legacy Display if needed, but we auto-fill items so maybe not needed */}
          {(!items || items.length === 0) && visit.sparepart && (
            <div className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border">
              {visit.sparepart}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Perbaikan yang Dilakukan</Label>
          <Textarea
            value={form.perbaikan}
            onChange={(e) => update("perbaikan", e.target.value)}
            rows={4}
            disabled={isReadOnly}
          />
        </div>
      </div>
      {isReadOnly && (
        <div className="text-sm text-gray-500 italic">
          Diagnosis hanya dapat diubah oleh mekanik selama status kunjungan belum SELESAI / BATAL
        </div>
      )}

      {/* ACTION */}
      <div className="flex justify-end gap-2">
        <Button variant="destructive" onClick={onSuccess}>
          Tutup
        </Button>

        {!isReadOnly && (
          <Button
            onClick={handleSave}
            disabled={saving || !isDiagnosisValid}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        )}
      </div>
    </div>
  );
}
