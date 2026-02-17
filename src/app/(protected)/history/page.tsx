"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Eye,
  History,
  User,
} from "lucide-react";
import { format } from "date-fns";
import PaginationControls from "@/components/shared/PaginationControls";
import { DatePicker } from "@/components/shared/DatePicker";

export default function HistoryPage() {
  const router = useRouter();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔍 GLOBAL SEARCH (LIVE)
  const [q, setQ] = useState("");

  // PAGINASI
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);


  // 🎛 FILTER
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // DETAIL DRAWER
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  // =====================
  // FETCH HISTORY (REUSABLE)
  // =====================
  async function fetchHistory(paramsOverride?: {
    q?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("scope", "history");

    const finalQ = paramsOverride?.q ?? q;
    const finalStatus = paramsOverride?.status ?? status;
    const finalFrom = paramsOverride?.dateFrom ?? dateFrom;
    const finalTo = paramsOverride?.dateTo ?? dateTo;
    const finalPage = paramsOverride?.page ?? page;

    if (finalQ) params.set("search", finalQ);
    if (finalStatus && finalStatus !== "ALL") params.set("status", finalStatus);
    if (finalFrom) params.set("dateFrom", finalFrom);
    if (finalTo) params.set("dateTo", finalTo);

    // 🔹 PAGINATION
    params.set("page", String(finalPage));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/visits/history?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      // 🔹 RESPONSE PAGINATION
      if (json.data) {
        setData(json.data);
        setTotalPages(json.meta.totalPages);
        setTotalItems(json.meta.total);
      } else {
        setData([]);
        setTotalItems(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // =====================
  // INITIAL LOAD
  // =====================
  useEffect(() => {
    fetchHistory({ page });
  }, [page]);

  // =====================
  // LIVE SEARCH (DEBOUNCE)
  // =====================
  useEffect(() => {
    const t = setTimeout(() => {
      fetchHistory({ q, page: 1 });
    }, 400);

    return () => clearTimeout(t);
  }, [q]);

  function openDetail(visit: any) {
    setSelectedVisit(visit);
    setOpen(true);
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">History Kunjungan</h1>
        <p className="text-muted-foreground text-sm">Riwayat servis dan kunjungan kendaraan.</p>
      </div>

      {/* ================= FILTER & SEARCH ================= */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
        {/* SEARCH */}
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white"
              placeholder="Cari No Mesin / Pemilik / Mekanik..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full xl:w-auto">
          {/* STATUS */}
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="ANTRI">Antri</SelectItem>
                <SelectItem value="PROSES">Proses</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
                <SelectItem value="BATAL">Batal</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <DatePicker
                date={dateFrom ? new Date(dateFrom) : undefined}
                onSelect={(d) => setDateFrom(format(d, "yyyy-MM-dd"))}
                className="w-full sm:w-auto"
              />
              <span className="text-muted-foreground">s/d</span>
              <DatePicker
                date={dateTo ? new Date(dateTo) : undefined}
                onSelect={(d) => setDateTo(format(d, "yyyy-MM-dd"))}
                className="w-full sm:w-auto"
              />
            </div>
          </div>    {/* APPLY BUTTON */}
          <Button
            variant="secondary"
            className="shrink-0 w-full sm:w-auto"
            onClick={() => {
              setPage(1);
              fetchHistory({ status, dateFrom, dateTo, page: 1 });
            }}
            disabled={loading}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      {loading ? (
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground animate-pulse text-sm">Memuat data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50 border-dashed">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium">Tidak ada riwayat</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            Belum ada data riwayat kunjungan yang ditemukan.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW (< md) */}
          <div className="grid gap-4 md:hidden">
            {data.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {v.vehicle.brand} {v.vehicle.model}
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
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {format(new Date(v.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Mekanik:</span>
                    <span className="font-medium">{v.mechanic?.name || "-"}</span>
                  </div>
                </CardContent>
                <div className="bg-slate-50/30 p-3">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => openDetail(v)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Lihat Detail
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-md border shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No Visit</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>Pemilik</TableHead>
                  <TableHead>Mekanik</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-normal whitespace-nowrap">
                      {format(new Date(v.createdAt), "dd/MM/yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(v.createdAt), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>{v.visitNumber}</TableCell>
                    <TableCell>
                      <div
                        className="font-semibold text-blue-800 hover:text-sky-600 cursor-pointer"
                        onClick={() => router.push(`/vehicles/${v.vehicle.id}`)}
                      >
                        {v.vehicle.engineNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.vehicle.brand} {v.vehicle.model}
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.vehicle.ownerName}
                      <div className="text-xs text-muted-foreground">{v.vehicle.phoneNumber}</div>
                    </TableCell>
                    <TableCell>{v.mechanic?.name ?? "-"}</TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(v)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* PAGINASI */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        loading={loading}
        itemName="riwayat"
      />

      {/* ================= DETAIL DRAWER ================= */}
      {open && selectedVisit && (
        <DiagnosisDialog
          open={open}
          onOpenChange={setOpen}
          visit={selectedVisit}
          readonly
        />
      )}
    </div>
  );
}
