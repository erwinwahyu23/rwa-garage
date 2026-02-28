"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import VehicleCreateDialog from "@/components/vehicle/vehicle-entry-dialog";
import DiagnosisForm from "@/components/diagnosis/DiagnosisForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DiagnosisDialog from "@/components/diagnosis/DiagnosisDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  User,
  Calendar,
  Phone,
  Settings,
  AlertCircle,
  CheckCheck
} from "lucide-react";
import { format } from "date-fns";

import useSWR from "swr";
import VehicleEditDialog from "@/components/vehicle/vehicle-edit-dialog";

export const runtime = "nodejs";

/* ================= TYPES ================= */

type Visit = {
  id: string;
  visitNumber: string;
  visitDate: string;
  status: "ANTRI" | "PROSES" | "SELESAI" | "BATAL";
  vehicle: {
    id: string;
    engineNumber: string;
    licensePlate?: string | null;
    brand: string;
    model: string;
    ownerName: string | null;
    phoneNumber: string | null;
  };
  mechanic?: {
    id: string;
    name: string;
  } | null;
};

type Mechanic = {
  id: string;
  name: string;
};

/* ================= PAGE ================= */

export default function WorklistPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  const [search, setSearch] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);

  // STATE
  const [openDetail, setOpenDetail] = useState(false);
  const [openEditVehicle, setOpenEditVehicle] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // CANCEL STATE
  const [cancelId, setCancelId] = useState<string | null>(null);

  /* ================= FETCH VISITS (SWR POLLING) ================= */

  const fetcher = (url: string) => fetch(url).then(r => r.json());

  const { data: visitsData, mutate } = useSWR(
    `/api/visits?scope=worklist&search=${encodeURIComponent(search)}`,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: false, // Optional: disable revalidate on window focus if polling is active
    }
  );

  // Sync SWR data to local state if needed, or use visitsData directly. 
  // For simplicity and less refactor, let's keep visits state but sync it.
  useEffect(() => {
    if (Array.isArray(visitsData)) {
      setVisits(visitsData);
    }
  }, [visitsData]);

  const fetchVisits = () => mutate(); // backward compatibility for existing calls

  /* ================= ADMIN FUNCTIONS ================= */

  const fetchMechanics = async () => {
    try {
      const res = await fetch("/api/mechanics");
      if (res.ok) {
        setMechanics(await res.json());
      }
    } catch (err) {
      console.error("Fetch mechanics error:", err);
    }
  };

  async function assignMechanic(visitId: string, mechanicId: string) {
    if (!mechanicId || !isAdmin) return;

    // Optimistic Update
    const updatedVisits = visits.map((v) =>
      v.id === visitId
        ? {
          ...v,
          mechanic: mechanics.find((m) => m.id === mechanicId) || null,
        }
        : v
    );

    // Update local immediately
    setVisits(updatedVisits);

    // Optimistic update SWR cache without revalidation initially
    mutate(updatedVisits, false);

    const res = await fetch(`/api/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanicId }),
    });

    if (!res.ok) {
      toast.error("Gagal assign mekanik");
      mutate(); // rollback by revalidating
    } else {
      // confirm consistency
      mutate();
    }
  }

  async function cancelVisit(id: string) {
    setCancelId(id);
  }
  async function handleConfirmCancel() {
    if (!cancelId) return;

    // Optimistic Update: remove from UI immediately
    const updatedVisits = visits.filter(v => v.id !== cancelId);
    setVisits(updatedVisits);
    mutate(updatedVisits, false);

    const res = await fetch(`/api/visits/${cancelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "BATAL" }),
    });

    if (!res.ok) {
      toast.error("Gagal membatalkan kunjungan");
      mutate(); // rollback
      return;
    }

    setCancelId(null);
    mutate(); // revalidate
  }

  async function finishVisit(id: string) {
    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SELESAI" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message || "Gagal menyelesaikan visit");
      return;
    }

    toast.success("Kunjungan diselesaikan");
    mutate();
  }

  /* ================= EFFECTS ================= */

  useEffect(() => {
    if (isAdmin) {
      fetchMechanics();
    }
  }, [isAdmin]);
  // Removed search useEffect as SWR handles key changes

  /* ================= HELPERS ================= */

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ANTRI":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80">Antri</Badge>;
      case "PROSES":
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-600/90">Proses</Badge>;
      case "SELESAI":
        return <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">Selesai</Badge>;
      case "BATAL":
        return <Badge variant="destructive" className="bg-red-600 hover:bg-red-600">Batal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Worklist</h1>
          <p className="text-muted-foreground text-sm">
            Daftar kendaraan yang sedang dalam antrian atau pengerjaan.
          </p>
        </div>
        <VehicleCreateDialog onSuccess={fetchVisits} />
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari No Mesin, Pemilik, dll..."
          className="pl-9 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground animate-pulse">Memuat data worklist...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white border-dashed">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium">Tidak ada antrian</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            Belum ada kendaraan yang masuk dalam worklist saat ini.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW (< md) */}
          <div className="grid gap-4 md:hidden">
            {visits.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        <span>{v.vehicle.brand} {v.vehicle.model}</span>
                        {v.vehicle.licensePlate && (
                          <span className="font-mono text-[10px] uppercase bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-900 border border-yellow-200">
                            {v.vehicle.licensePlate}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {v.vehicle.engineNumber}
                      </CardDescription>
                    </div>
                    {getStatusBadge(v.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 text-sm space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-foreground font-medium">{v.vehicle.ownerName || "Tanpa Nama"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(v.visitDate), "dd/MM/yyyy HH:mm")}</span>
                  </div>

                  {/* Mechanic Assignment for Mobile */}
                  <div className="pt-2 border-t mt-2">
                    <span className="text-xs text-muted-foreground block mb-1">Mekanik:</span>
                    {isAdmin ? (
                      <select
                        className="w-full text-sm border rounded p-1.5 bg-background"
                        value={v.mechanic?.id || ""}
                        onChange={(e) => assignMechanic(v.id, e.target.value)}
                      >
                        <option value="">-- Pilih --</option>
                        {mechanics.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-medium">{v.mechanic?.name || "-"}</span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/30 p-3 flex gap-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => {
                      setSelectedVisit(v);
                      setOpen(true);
                    }}
                  >
                    Diagnosis
                  </Button>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedVisit(v);
                        setOpenDetail(true);
                      }}>
                        Detail Lengkap
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedVisit(v);
                        setOpenEditVehicle(true);
                      }}>
                        Edit Kendaraan
                      </DropdownMenuItem>
                      {isAdmin && v.status === "ANTRI" && (
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => cancelVisit(v.id)}
                        >
                          Batalkan
                        </DropdownMenuItem>
                      )}
                      {session?.user?.role === "SUPERADMIN" && v.status === "PROSES" && (
                        <DropdownMenuItem
                          className="text-green-600 focus:text-green-600"
                          onClick={() => finishVisit(v.id)}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Selesaikan
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block rounded-md border shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-[200px]">Visit ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>No. Polisi</TableHead>
                  <TableHead>Pemilik</TableHead>
                  <TableHead>Mekanik</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      <span
                        className="text-blue-800 cursor-pointer hover:text-sky-600"
                        onClick={() => {
                          setSelectedVisit(v);
                          setOpen(true);
                        }}
                      >
                        {v.visitNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-normal">
                          {format(new Date(v.visitDate), "dd/MM/yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(v.visitDate), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{v.vehicle.brand} {v.vehicle.model}</div>
                      <div className="text-xs text-muted-foreground">{v.vehicle.engineNumber}</div>
                    </TableCell>
                    <TableCell>
                      {v.vehicle.licensePlate ? (
                        <span className="text-sm">
                          {v.vehicle.licensePlate}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Belum ada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{v.vehicle.ownerName || <span className="text-slate-400 italic">Tanpa Nama</span>}</div>
                      <div className="text-xs text-muted-foreground">{v.vehicle.phoneNumber}</div>
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {isAdmin ? (
                        <div className="relative">
                          <select
                            className={`w-full text-sm border rounded px-2 py-1 bg-transparent hover:bg-slate-50 transition-colors cursor-pointer appearance-none pr-8 ${!v.mechanic?.id ? "text-slate-500" : ""}`}
                            value={v.mechanic?.id || ""}
                            onChange={(e) => assignMechanic(v.id, e.target.value)}
                          >
                            <option value="" className="text-slate-500">Pilih Mekanik</option>
                            {mechanics.map((m) => (
                              <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>
                            ))}
                          </select>
                          <Settings className="h-3 w-3 absolute right-2 top-1.5 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-slate-100 p-1 rounded">
                            <User className="h-3 w-3 text-slate-500" />
                          </div>
                          <span className="text-sm">{v.mechanic?.name || "Belum ada"}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[200px]">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedVisit(v);
                            setOpenDetail(true);
                          }}>
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedVisit(v);
                            setOpenEditVehicle(true);
                          }}>
                            Edit Kendaraan
                          </DropdownMenuItem>
                          {isAdmin && v.status === "ANTRI" && (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => cancelVisit(v.id)}
                            >
                              Batalkan Kunjungan
                            </DropdownMenuItem>
                          )}
                          {session?.user?.role === "SUPERADMIN" && v.status === "PROSES" && (
                            <DropdownMenuItem
                              className="text-green-600 focus:text-green-600 focus:bg-green-50"
                              onClick={() => finishVisit(v.id)}
                            >
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Selesaikan
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* DIALOGS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Pengerjaan / Diagnosis</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <DiagnosisForm
              visit={selectedVisit}
              readonly={
                session?.user?.role === "ADMIN" ||
                selectedVisit.status === "BATAL" ||
                selectedVisit.status === "SELESAI"
              }
              onSuccess={() => {
                setOpen(false);
                fetchVisits();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Readonly Detail Drawer/Dialog */}
      <DiagnosisDialog
        open={openDetail}
        onOpenChange={setOpenDetail}
        visit={selectedVisit}
        readonly
      />

      {/* EDIT VEHICLE DIALOG */}
      {selectedVisit && (
        <VehicleEditDialog
          open={openEditVehicle}
          onOpenChange={setOpenEditVehicle}
          vehicle={{
            id: selectedVisit.vehicle.id,
            engineNumber: selectedVisit.vehicle.engineNumber,
            licensePlate: selectedVisit.vehicle.licensePlate, // Added
            brand: selectedVisit.vehicle.brand,
            model: selectedVisit.vehicle.model,
            ownerName: selectedVisit.vehicle.ownerName,
            phoneNumber: (selectedVisit.vehicle as any).phoneNumber, // Cast as any because internal type missing, fixing soon
          }}
          onSuccess={() => {
            fetchVisits(); // refresh SWR by mutate actually
          }}
        />
      )}

      {/* CONFIRM CANCEL DIALOG */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Batalkan Kunjungan?
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin membatalkan kunjungan ini?
              Data yang sudah dibatalkan tidak dapat dikembalikan ke antrian.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelId(null)}>
              Kembali
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white focus-visible:ring-red-600 hover:focus-visible:ring-red-700"
              onClick={handleConfirmCancel}
            >
              Ya, Batalkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
