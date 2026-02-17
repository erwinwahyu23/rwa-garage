"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DiagnosisForm from "@/components/diagnosis/DiagnosisForm";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import VisitTimelineItem from "@/components/vehicle/VisitTimelineItem";
import DiagnosisDialog from "@/components/diagnosis/DiagnosisDialog";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";


type Vehicle = {
  id: string;
  engineNumber: string;
  licensePlate?: string | null;
  brand: string;
  model: string | null;
  ownerName: string | null;
  phoneNumber?: string | null;
  visits: Visit[];
};

type Visit = {
  id: string;
  visitNumber: string;
  status: string;
  diagnosis?: string | null;
  pemeriksaan?: string | null;
  sparepart?: string | null;
  perbaikan?: string | null;
  createdAt: string;
  mechanic?: { name: string };
};

export default function VehicleRecordPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const searchParams = useSearchParams();
  const engineParam = searchParams.get("engineNumber");
  const router = useRouter();

  const [engineSearch, setEngineSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);

  // detail visit
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  /* ======================
     SEARCH ENGINE NUMBER
     ====================== */
  useEffect(() => {
    if (!engineSearch.trim()) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      const res = await fetch(`/api/vehicles?search=${engineSearch}`);
      const data = await res.json();
      setSuggestions(data);
    }, 300);

    return () => clearTimeout(t);
  }, [engineSearch]);

  /* ======================
     LOAD VEHICLE RECORD
     ====================== */
  async function loadVehicleRecord(engineNumber: string) {
    setLoading(true);
    setVehicle(null);

    const res = await fetch(
      `/api/vehicle-record?engineNumber=${engineNumber}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      // console.log("LOADED VEHICLE:", data);
      setVehicle(data);
    } else {
      toast.error("Vehicle record tidak ditemukan");
    }

    setSuggestions([]);
    setLoading(false);
  }

  /* ======================
     AUTO LOAD FROM URL
     ====================== */
  useEffect(() => {
    if (engineParam) {
      setEngineSearch(engineParam);
      loadVehicleRecord(engineParam);
    }
  }, [engineParam]);

  // ================= LIST OF VEHICLES (PAGINATED) =================
  const PAGE_SIZE = 25;
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listItems, setListItems] = useState<Vehicle[]>([]);
  const [listLoading, setListLoading] = useState(false);
  // search for list (live)
  const [searchList, setSearchList] = useState("");
  const [qList, setQList] = useState("");



  // debounce qList -> searchList
  useEffect(() => {
    const t = setTimeout(() => {
      setListPage(1);
      setSearchList(qList.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [qList]);

  useEffect(() => {
    let cancelled = false;

    async function fetchList(page: number) {
      setListLoading(true);
      try {
        if (searchList.trim()) {
          const res = await fetch(`/api/vehicles?search=${encodeURIComponent(searchList)}`);
          if (!res.ok) throw new Error("Failed to search vehicles");
          const data = await res.json();
          if (cancelled) return;
          // search endpoint returns an array
          setListItems(Array.isArray(data) ? data : []);
          setListTotal(Array.isArray(data) ? data.length : 0);
        } else {
          const res = await fetch(`/api/vehicles?page=${page}&pageSize=${PAGE_SIZE}`);
          if (!res.ok) throw new Error("Failed to fetch vehicles");
          const data = await res.json();
          if (cancelled) return;
          setListItems(data.items);
          setListTotal(data.total);
        }
      } catch (err) {
        console.error("LOAD VEHICLE LIST ERROR:", err);
        if (!cancelled) setListItems([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    fetchList(listPage);

    return () => {
      cancelled = true;
    };
  }, [listPage, searchList]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vehicle Record</h1>

      {/* ================= VEHICLE LIST ================= */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white w-full"
              placeholder="Cari mesin / merk / pemilik..."
              value={qList}
              onChange={(e) => setQList(e.target.value)}
            />
          </div>
          {searchList && (
            <Button size="sm" variant="ghost" onClick={() => { setQList(''); setSearchList(''); setListPage(1); }}>
              Clear Filter
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {listLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat daftar kendaraan...</div>
          ) : listItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Tidak ada kendaraan untuk ditampilkan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-3 font-medium">No Mesin</th>
                    <th className="p-3 font-medium">No. Polisi</th>
                    <th className="p-3 font-medium">Brand / Merk</th>
                    <th className="p-3 font-medium">Pemilik</th>
                    <th className="p-3 font-medium">No. HP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listItems.map((v) => (
                    <tr
                      key={v.id}
                      className="bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/vehicles/${v.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/vehicles/${v.id}`);
                        }
                      }}
                    >
                      <td className="p-3">{v.engineNumber}</td>
                      <td className="p-3">{v.licensePlate || '-'}</td>
                      <td className="p-3">{v.brand} {v.model || ''}</td>
                      <td className="p-3">{v.ownerName || '-'}</td>
                      <td className="p-3">{v.phoneNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table >
            </div >
          )
          }
        </div >

        {/* Pagination controls */}
        < PaginationControls
          currentPage={listPage}
          totalPages={Math.max(1, Math.ceil(listTotal / PAGE_SIZE))}
          totalItems={listTotal}
          onPageChange={setListPage}
          loading={listLoading}
          itemName="kendaraan"
        />
      </div >
      {/* ================= TIMELINE ================= */}
      {
        vehicle && (
          <div className="space-y-6">
            <h2 className="font-semibold">Riwayat Kunjungan</h2>

            {vehicle.visits.length === 0 && (
              <p className="text-sm text-gray-500">
                Belum ada riwayat kunjungan
              </p>
            )}

            <div className="space-y-6">
              {vehicle.visits.map((v, idx) => (
                <VisitTimelineItem
                  key={v.id}
                  visit={v}
                  isLast={idx === vehicle.visits.length - 1}
                  onDetail={() => {
                    setSelectedVisit(v);
                    setOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )
      }
      {/* ================= VISIT DETAIL ================= */}
      <DiagnosisDialog
        open={open}
        onOpenChange={setOpen}
        visit={
          selectedVisit
            ? {
              ...selectedVisit,
              vehicle: {
                engineNumber: vehicle!.engineNumber,
                licensePlate: vehicle!.licensePlate,
                brand: vehicle!.brand,
                ownerName: vehicle!.ownerName,
              },
            }
            : null
        }
        readonly={
          isAdmin ||
          !!selectedVisit &&
          (selectedVisit.status === "BATAL" || selectedVisit.status === "SELESAI")
        }
      />


    </div >
  );
}
