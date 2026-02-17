"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VehicleCreateDialog from "@/components/vehicle/vehicle-create-dialog";
import { Plus } from "lucide-react";

/* ================= TYPES ================= */

type Vehicle = {
  id: string;
  engineNumber: string;
  brand: string;
  model: string;
  ownerName: string | null;
  phoneNumber: string | null;
  visits: {
    id: string;
    status: "ANTRI" | "PROSES";
  }[];
};

type Props = {
  onSuccess?: () => void;
};

/* ================= COMPONENT ================= */

export default function VehicleEntryDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);

  /* ================= SEARCH ================= */

  useEffect(() => {
    if (!open) return;

    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false); // reset state search
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/vehicles/search?q=${encodeURIComponent(q)}`
        );
        const json = await res.json();

        setResults(Array.isArray(json) ? json : []);
        setHasSearched(true); // ⬅️ search selesai
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [q, open]);

  /* ================= ACTIONS ================= */

  async function createVisit(vehicleId: string) {
    await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId }),
    });

    setOpen(false);
    setQ("");
    setResults([]);
    onSuccess?.();
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-sky-900 hover:bg-sky-700 text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        Tambah Kunjungan
      </Button>

      {/* ================= ENTRY DIALOG ================= */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90vw] max-w-3xl max-h-[90vh] overflow-y-auto space-y-3 bg-white">
          <DialogHeader>
            <DialogTitle>Tambah Kendaraan / Kunjungan</DialogTitle>
          </DialogHeader>

          {/* SEARCH */}
          <input
            className="border px-3 py-2 rounded w-full"
            placeholder="Cari kendaraan (mesin, pemilik, HP, merk...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {loading && (
            <p className="text-sm text-gray-500 mt-2">Mencari...</p>
          )}

          {/* FOUND */}
          {hasSearched && results.length > 0 && (
            <div className="border rounded mt-3 divide-y">
              {results.map((v) => {
                const hasActiveVisit = v.visits.length > 0;

                return (
                  <div
                    key={v.id}
                    className="p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold">
                        {v.brand} {v.model} — {v.engineNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        Pemilik: {v.ownerName || "-"} | {v.phoneNumber || "-"}
                      </div>

                      {hasActiveVisit && (
                        <div className="text-xs text-red-600 mt-1">
                          ⚠ Masih ada kunjungan {v.visits[0].status}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={hasActiveVisit}
                      onClick={() => createVisit(v.id)}
                      title={
                        hasActiveVisit
                          ? "Kendaraan masih memiliki kunjungan aktif"
                          : "Tambah kunjungan baru"
                      }
                    >
                      Tambah Kunjungan
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ALWAYS SHOW ADD BUTTON IF SEARCHED (Even if found) */}
          {hasSearched && results.length > 0 && (
            <div className="border-t pt-3 mt-2 flex flex-wrap justify-between items-center gap-2 bg-slate-200 p-3 rounded">
              <span className="text-sm text-gray-600 w-full text-center sm:w-auto sm:text-left">
                Bukan kendaraan di atas?
              </span>
              <Button
                variant="secondary"
                className="bg-white w-full sm:w-auto"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setOpenCreate(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Tambah Kendaraan Baru
              </Button>
            </div>
          )}

          {/* NOT FOUND */}
          {!loading && hasSearched && results.length === 0 && (
            <div className="border rounded p-4 mt-3 text-center space-y-3 bg-slate-200">
              <p className="text-sm text-gray-500">
                Kendaraan tidak ditemukan
              </p>

              <Button
                variant="secondary"
                className="bg-white"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setOpenCreate(true);
                }}
              >
                Tambah Kendaraan Baru
              </Button>
            </div>
          )}

        </DialogContent>
      </Dialog >

      {/* ================= CREATE VEHICLE DIALOG ================= */}
      < VehicleCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        defaultEngineNumber={q}
        onSuccess={async (vehicleId) => {
          await createVisit(vehicleId);
          setOpenCreate(false);
          onSuccess?.();
        }
        }
      />
    </>
  );
}
