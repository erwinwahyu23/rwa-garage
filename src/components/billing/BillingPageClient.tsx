"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, FileText, CheckCircle, Clock, MessageCircle, FilePlus, Eye } from "lucide-react";
import PaginationControls from "@/components/shared/PaginationControls";
import { DatePicker } from "@/components/shared/DatePicker";

export default function BillingPageClient() {
    const { data: session } = useSession();
    const router = useRouter();
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Pagination
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [page, setPage] = useState(1);
    const [metadata, setMetadata] = useState({ total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false });

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
        if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);

        // Timezone Fix: Send ISO timestamps calculated from client's local time
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            params.set("startTs", start.toISOString());
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            params.set("endTs", end.toISOString());
        }
        params.set("page", page.toString());
        params.set("limit", "25");

        fetch(`/api/billing?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.items) {
                    setVisits(data.items);
                    setMetadata(data.metadata);
                } else {
                    setVisits([]);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [debouncedSearch, statusFilter, startDate, endDate, page]);

    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Billing & Invoices</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? "Kelola tagihan dan pembayaran servis." : "Daftar riwayat servis dan status tagihan."}
                    </p>
                </div>
            </div>

            {/* Filters - Single Row, No Card */}
            <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full lg:w-auto">
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Cari No Polisi, Nama, Invoice..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="w-full lg:w-auto">
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="UNPAID">Belum Lunas</option>
                        <option value="PAID">Lunas</option>
                        <option value="VOID">Dibatalkan</option>
                        <option value="NONE">Belum Ada Tagihan</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <DatePicker
                        date={startDate ? new Date(startDate) : undefined}
                        onSelect={(d) => { setStartDate(format(d, "yyyy-MM-dd")); setPage(1); }}
                        className="w-full sm:w-auto"
                    />
                    <span className="self-center text-muted-foreground">s/d</span>
                    <DatePicker
                        date={endDate ? new Date(endDate) : undefined}
                        onSelect={(d) => { setEndDate(format(d, "yyyy-MM-dd")); setPage(1); }}
                        className="w-full sm:w-auto"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100">
                            <TableHead>Tgl Kunjungan</TableHead>
                            <TableHead>No. Antrian</TableHead>
                            <TableHead>Kendaraan</TableHead>
                            <TableHead>Mekanik</TableHead>
                            <TableHead>Status Servis</TableHead>
                            <TableHead>Status Invoice</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : visits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    Tidak ada data yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visits.map((visit) => {
                                const invoice = visit.invoice;
                                const invStatus = invoice ? invoice.status : "NOT_CREATED";

                                return (
                                    <TableRow key={visit.id}>
                                        <TableCell>{format(new Date(visit.visitDate), "dd MMM yyyy", { locale: id })}</TableCell>
                                        <TableCell className="font-mono font-medium">{visit.visitNumber}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{visit.vehicle?.brand} {visit.vehicle?.model}</div>
                                            <div className="text-xs text-muted-foreground">{visit.vehicle?.engineNumber}</div>
                                        </TableCell>
                                        <TableCell>{visit.mechanic?.name || "-"}</TableCell>
                                        <TableCell>
                                            {visit.status === "SELESAI" && <Badge className="text-white bg-green-600 hover:bg-green-700 text-[10px] px-2 py-0.5 h-5">SELESAI</Badge>}
                                            {visit.status === "PROSES" && <Badge className="text-white bg-blue-600 hover:bg-blue-700 text-[10px] px-2 py-0.5 h-5">PROSES</Badge>}
                                            {visit.status === "ANTRI" && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-[10px] px-2 py-0.5 h-5">ANTRI</Badge>}
                                            {visit.status === "BATAL" && <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-5">BATAL</Badge>}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            {visit.invoices && visit.invoices.length > 0 ? (
                                                <div className="flex flex-col gap-1 items-start">
                                                    {visit.invoices.map((inv: any) => (
                                                        <div key={inv.id} className="flex items-center gap-2">
                                                            {inv.status === "UNPAID" && <Badge variant="outline" className="border-red-500 text-red-500 text-[10px] px-1 py-0 h-5">Unpaid</Badge>}
                                                            {inv.status === "PAID" && <Badge variant="outline" className="border-green-500 text-green-500 bg-green-50 text-[10px] px-1 py-0 h-5">Paid</Badge>}
                                                            {inv.status === "VOID" && <Badge variant="outline" className="border-red-500 text-red-500 bg-red-50 text-[10px] px-1 py-0 h-5">Void</Badge>}
                                                            <span className="text-[10px] text-muted-foreground">{inv.invoiceNumber}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Belum Ada</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium align-top">
                                            {visit.invoices && visit.invoices.length > 0 ? (
                                                <div className="flex flex-col gap-1 items-end">
                                                    {visit.invoices.map((inv: any) => (
                                                        <div key={inv.id} className="h-5 flex items-center">
                                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(inv.totalAmount)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            {isAdmin ? (
                                                <div className="flex flex-col gap-1 justify-end items-end">
                                                    {visit.invoices?.map((inv: any) => (
                                                        <div key={inv.id} className="flex items-center gap-1 justify-end h-5">
                                                            {visit.vehicle?.phoneNumber && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    title="Kirim ke WA"
                                                                    onClick={() => {
                                                                        const phone = visit.vehicle?.phoneNumber.replace(/\D/g, '').replace(/^0/, '62');
                                                                        const vehicleInfo = `${visit.vehicle?.brand || ''} ${visit.vehicle?.model || ''} / ${visit.vehicle?.licensePlate || ''}`.trim();
                                                                        const total = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(inv.totalAmount);
                                                                        const date = format(new Date(inv.createdAt), "dd/MM/yyyy");

                                                                        const message = `*RWA GARAGE*

Halo Bapak/Ibu ${visit.vehicle?.ownerName || 'Pelanggan'},

Kami informasikan bahwa pembayaran untuk invoice berikut telah kami terima dengan baik

No. Invoice : ${inv.invoiceNumber}
Kendaraan : ${vehicleInfo}
Total Dibayarkan : ${total}
Tanggal Pembayaran : ${date}

Terima kasih atas kepercayaan Anda kepada RWA GARAGE.
Semoga kendaraan selalu dalam kondisi prima`;

                                                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                                                    }}
                                                                >
                                                                    <MessageCircle className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 text-xs px-2 justify-end text-muted-foreground hover:text-blue-600"
                                                                onClick={() => router.push(`/billing/${inv.id}`)}
                                                            >
                                                                <Eye className="mr-2 h-3 w-3" /> Lihat Invoice
                                                            </Button>
                                                        </div>
                                                    ))}

                                                    {(!invoice || invoice.status === "VOID") && visit.status === "SELESAI" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs hover:text-blue-600 mt-1"
                                                            onClick={() => router.push(`/billing/create?visitId=${visit.id}`)}
                                                        >
                                                            <FilePlus className="mr-1 h-3 w-3" /> Buat Invoice
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                invoice ? (
                                                    <Button size="sm" variant="secondary" onClick={() => router.push(`/billing/${invoice.id}`)}>
                                                        Lihat
                                                    </Button>
                                                ) : <span className="text-xs text-muted-foreground italic">Menunggu Admin</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <PaginationControls
                currentPage={metadata.page}
                totalPages={metadata.totalPages}
                totalItems={metadata.total}
                onPageChange={setPage}
                loading={loading}
            />
        </div>
    );
}
