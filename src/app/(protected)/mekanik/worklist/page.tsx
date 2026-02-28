"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import VehicleCreateDialog from "@/components/vehicle/vehicle-entry-dialog";
import DiagnosisForm from "@/components/diagnosis/DiagnosisForm";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  User,
  Calendar,
  AlertCircle,
  Wrench,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

import useSWR from "swr";
import VehicleEditDialog from "@/components/vehicle/vehicle-edit-dialog";

/* ================= TYPES ================= */

type Visit = {
  id: string;
  visitNumber: string;
  visitDate: string;
  status: "ANTRI" | "PROSES" | "SELESAI" | "BATAL";
  mechanicId?: string | null;
  mechanic?: { name?: string } | null;
  diagnosis?: string | null;
  pemeriksaan?: string | null;
  sparepart?: string | null;
  perbaikan?: string | null;
  vehicle: {
    id: string;
    engineNumber: string;
    licensePlate?: string | null;
    brand: string;
    model: string;
    ownerName: string | null;
    phoneNumber: string | null;
  };
};

export default function MekanikWorklistPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [openEditVehicle, setOpenEditVehicle] = useState(false);

  // CONFIRMATION STATE
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingVisit, setPendingVisit] = useState<Visit | null>(null);

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  /* ================= FETCH (SWR) ================= */

  const fetcher = (url: string) => fetch(url).then((r) => r.json());

  const { data: visitsData, mutate } = useSWR("/api/visits/", fetcher, {
    refreshInterval: 5000,
  });

  useEffect(() => {
    if (Array.isArray(visitsData)) {
      setVisits(visitsData);
    }
  }, [visitsData]);

  const fetchVisits = () => mutate(); // Keep explicit refresh working
  const loading = !visitsData;

  /* ================= HELPERS ================= */

  const isDiagnosisComplete = (v: Visit) =>
    v.diagnosis &&
    v.pemeriksaan &&
    v.sparepart &&
    v.perbaikan;

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

  /* ================= ACTIONS ================= */

  async function handleKerjakan(id: string) {
    // Optimistic Update
    const updatedVisits = visits.map((v) =>
      v.id === id ? { ...v, mechanicId: session?.user?.id, mechanic: { name: session?.user?.name || "Saya" } } : v
    );
    setVisits(updatedVisits);
    mutate(updatedVisits, false);

    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TAKE" }),
    });

    if (!res.ok) {
      toast.error("Gagal mengambil pekerjaan");
      mutate(); // rollback
      return;
    }
    toast.success("Pekerjaan diambil");
    mutate(); // revalidate
  }

  function handleSelesaikan(v: Visit) {
    if (!isDiagnosisComplete(v)) {
      toast.error("Lengkapi diagnosis sebelum menyelesaikan pekerjaan");
      return;
    }
    setPendingVisit(v);
    setConfirmOpen(true);
  }

  async function performFinish() {
    if (!pendingVisit) return;
    const v = pendingVisit;
    setConfirmOpen(false);

    // Optimistic Update
    const updatedVisits = visits.map((vis) =>
      vis.id === v.id ? { ...vis, status: "SELESAI" as const } : vis
    );
    setVisits(updatedVisits);
    mutate(updatedVisits, false);

    const res = await fetch(`/api/visits/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SELESAI" }),
    });

    if (!res.ok) {
      toast.error("Gagal menyelesaikan pekerjaan");
      mutate(); // rollback
      return;
    }

    toast.success("Pekerjaan selesai");
    mutate(); // revalidate
  }

  // Effect removed as fetch is handled by SWR
  // useEffect(() => {
  //   fetchVisits();
  // }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Worklist Mekanik</h1>
          <p className="text-muted-foreground text-sm">
            Ambil antrian atau kelola pekerjaan yang sedang berlangsung.
          </p>
        </div>
        {!isAdmin && <VehicleCreateDialog onSuccess={fetchVisits} />}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground animate-pulse text-sm">Memuat data worklist...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white border-dashed">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium">Tidak ada pekerjaan</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            Saat ini belum ada kendaraan yang perlu dikerjakan.
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
                          <span className="text-sm">
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

                  {/* Action Buttons for Mobile */}
                  <div className="pt-2 border-t mt-2 flex flex-col gap-2">
                    {v.status === "ANTRI" && !v.mechanicId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleKerjakan(v.id)}
                        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-transform hover:scale-105"
                      >
                        Ambil Servis
                      </Button>
                    )}
                    {v.status === "PROSES" && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleSelesaikan(v)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Selesaikan Servis
                      </Button>
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
                        setOpen(true);
                      }}>
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedVisit(v);
                        setOpenEditVehicle(true);
                      }}>
                        Edit Kendaraan
                      </DropdownMenuItem>
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
                    <TableCell className="font-medium text-blue-800 hover:text-blue-600 cursor-pointer"
                      onClick={() => {
                        setSelectedVisit(v);
                        setOpen(true);
                      }}
                    >
                      {v.visitNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-normal">
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
                    <TableCell className="text-sm">
                      {v.mechanic?.name || <span className="text-slate-400 italic">Belum ada</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 ">
                        {v.status === "ANTRI" && !v.mechanicId && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleKerjakan(v.id)}
                            className="text-sm"
                          >
                            Ambil Servis
                          </Button>
                        )}
                        {v.status === "PROSES" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-sm"
                              onClick={() => handleSelesaikan(v)}
                            >
                              Selesaikan Servis
                            </Button>
                          </>
                        )}
                        {/* Details Menu */}
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[160px]">
                            <DropdownMenuItem onClick={() => {
                              setSelectedVisit(v);
                              setOpen(true);
                            }}>
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedVisit(v);
                              setOpenEditVehicle(true);
                            }}>
                              Edit Kendaraan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* DIAGNOSIS DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Pengerjaan & Diagnosis</DialogTitle>
          </DialogHeader>

          {selectedVisit && (
            <DiagnosisForm
              visit={selectedVisit}
              readonly={
                isAdmin ||
                selectedVisit.status === "BATAL" ||
                selectedVisit.status === "SELESAI"
              }
              onSuccess={() => {
                setOpen(false);
                fetchVisits(); // refresh status
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
            phoneNumber: (selectedVisit.vehicle as any).phoneNumber,
          }}
          onSuccess={() => {
            mutate();
          }}
        />
      )}

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Selesaikan Servis?"
        description="Pastikan semua diagnosis telah diisi dengan benar. Servis yang sudah selesai tidak dapat diubah lagi."
        confirmText="Ya, Selesai"
        onConfirm={performFinish}
      />
    </div>
  );
}
