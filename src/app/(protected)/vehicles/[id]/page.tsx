"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DiagnosisDialog from "@/components/diagnosis/DiagnosisDialog";
import VehicleEditDialog from "@/components/vehicle/vehicle-edit-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Car,
  User,
  Calendar,
  Settings,
  History,
  FileText,
  Edit
} from "lucide-react";
import { format } from "date-fns";

type Vehicle = {
  id: string;
  engineNumber: string;
  licensePlate?: string | null;
  brand: string;
  model: string;
  ownerName: string | null;
  phoneNumber?: string | null;
  createdAt?: string;
};

type Visit = {
  id: string;
  visitNumber: string;
  createdAt: string;
  status: "ANTRI" | "PROSES" | "SELESAI" | "BATAL";
  mechanic?: {
    name: string;
  } | null;
  diagnosis?: string;
  keluhan?: string;
};

export default function VehicleRecordPage() {
  const { id } = useParams();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  async function fetchData() {
    if (!id) {
      setLoading(false);
      setVehicle(null);
      setVisits([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      setVehicle(json.vehicle);
      setVisits(json.visits);
    } catch (e) {
      console.error(e);
      // Fallback or toast could be added here
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  /* ================= HELPERS ================= */

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ANTRI":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Antri</Badge>;
      case "PROSES":
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-600">Proses</Badge>;
      case "SELESAI":
        return <Badge variant="default" className="bg-green-600 hover:bg-green-600">Selesai</Badge>;
      case "BATAL":
        return <Badge variant="destructive" className="bg-red-600 hover:bg-red-600">Batal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <p className="text-muted-foreground animate-pulse">Memuat data kendaraan...</p>
    </div>
  );

  if (!vehicle) return (
    <div className="flex bg-slate-50 flex-col items-center justify-center h-[50vh] rounded-lg border border-dashed">
      <Car className="h-10 w-10 text-muted-foreground mb-2" />
      <h3 className="text-lg font-medium">Kendaraan Tidak Ditemukan</h3>
      <Button onClick={() => router.back()} variant="link" className="mt-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Detail Kendaraan</h1>
            <Badge variant="outline" className="font-mono text-xs">{vehicle.engineNumber}</Badge>
            {vehicle.licensePlate && (
              <Badge className="bg-sky-900 text-white hover:bg-sky-800 text-xs">{vehicle.licensePlate}</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Informasi lengkap dan riwayat servis.
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex bg-white">
          <TabsTrigger value="info" className="data-[state=active]:bg-sky-900 data-[state=active]:text-white">Informasi</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-sky-900 data-[state=active]:text-white">Riwayat Servis</TabsTrigger>
        </TabsList>

        {/* ================= INFO TAB ================= */}
        <TabsContent value="info" className="mt-4">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data Kendaraan</CardTitle>
                <CardDescription>Informasi teknis dan kepemilikan.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Spesifikasi
                  </h4>
                  <div className="grid gap-3 pl-1">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">No. Mesin</span>
                      <span className="col-span-2 text-sm font-medium font-mono">{vehicle.engineNumber}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">No. Polisi</span>
                      <span className="col-span-2 text-sm font-medium font-mono uppercase bg-yellow-100 px-2 py-0.5 rounded w-fit text-yellow-900 border border-yellow-200">
                        {vehicle.licensePlate || "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">Merk</span>
                      <span className="col-span-2 text-sm font-medium">{vehicle.brand}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">Model</span>
                      <span className="col-span-2 text-sm font-medium">{vehicle.model}</span>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Pemilik
                  </h4>
                  <div className="grid gap-3 pl-1">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">Nama</span>
                      <span className="col-span-2 text-sm font-medium">{vehicle.ownerName || "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-sm text-slate-500">No. Telepon</span>
                      <span className="col-span-2 text-sm font-medium flex items-center gap-2">
                        {vehicle.phoneNumber || "-"}
                      </span>
                    </div>
                    {/* Removed Terdaftar (createdAt) as requested by user to switch to Plate Number */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= HISTORY TAB ================= */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Riwayat Kunjungan</CardTitle>
              <CardDescription>Daftar servis yang pernah dilakukan.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Tanggal</TableHead>
                      <TableHead>No. Visit</TableHead>
                      <TableHead>Keluhan</TableHead>
                      <TableHead>Mekanik</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          Belum ada riwayat kunjungan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visits.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {format(new Date(v.createdAt), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{v.visitNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                            {v.keluhan || "-"}
                          </TableCell>
                          <TableCell>{v.mechanic?.name || "-"}</TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedVisit(v);
                                setOpen(true);
                              }}
                            >
                              <FileText className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Detail</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DETAIL DRAWER (re-using DiagnosisDialog) */}
      <DiagnosisDialog
        open={open}
        onOpenChange={setOpen}
        visit={
          selectedVisit
            ? {
              ...selectedVisit,
              vehicle: {
                engineNumber: vehicle!.engineNumber,
                brand: vehicle!.brand,
                model: vehicle!.model,
                ownerName: vehicle!.ownerName,
                licensePlate: vehicle!.licensePlate,
              },
            }
            : null
        }
        readonly
      />

      {vehicle && (
        <VehicleEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          vehicle={vehicle}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
