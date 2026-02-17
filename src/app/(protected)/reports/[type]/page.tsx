"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VisitsReportTable } from "@/components/reports/VisitsReportTable";
import { BillingReportTable } from "@/components/reports/BillingReportTable";
import { StockReportTable } from "@/components/reports/StockReportTable";
import { PurchasesReportTable } from "@/components/reports/PurchasesReportTable";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";

import { Loader2, FileDown } from "lucide-react";
import { DatePicker } from "@/components/shared/DatePicker";

const REPORT_TITLES: Record<string, string> = {
    visits: "Laporan Kunjungan",
    billing: "Laporan Billing & Keuangan",
    stock: "Laporan Stok Opname & Audit",
    purchases: "Laporan Pembelian Sparepart"
};

export default function DynamicReportPage() {
    const params = useParams();
    const reportType = (params.type as string) || "visits";

    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    async function fetchData() {
        setLoading(true);
        try {
            // Timezone Fix: Send ISO timestamps calculated from client's local time
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const startTs = start.toISOString();

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const endTs = end.toISOString();

            const res = await fetch(`/api/reports/${reportType}?startTs=${startTs}&endTs=${endTs}`);
            if (!res.ok) throw new Error("Gagal mengambil data laporan");
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            toast.error(e.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    // Auto fetch when type changes? Maybe not, let user click. 
    // But usually better DX to auto-fetch if dates are set.
    // Let's keep manual trigger to avoid spam, or auto fetch on mount?
    // Let's stick to manual "Tampilkan Data" as per previous flow, but empty state initially.

    function exportToExcel() {
        if (data.length === 0) {
            toast.error("Tidak ada data untuk diexport");
            return;
        }

        const wb = XLSX.utils.book_new();
        let exportData: any[] = [];

        if (reportType === 'visits') {
            exportData = data.map(item => ({
                "No. Kunjungan": item.visitNumber,
                "Tanggal": format(new Date(item.visitDate), "dd/MM/yyyy"),
                "Merk": item.vehicle?.brand || '-',
                "Model": item.vehicle?.model || '-',
                "Nomor Mesin": item.vehicle?.engineNumber || '-',
                "No. Polisi": item.vehicle?.licensePlate || '-',
                "Pemilik": item.vehicle?.ownerName || "-",
                "Mekanik": item.mechanic?.name || "-",
                "Diagnosis": item.diagnosis || "-",
                "Pemeriksaan": item.pemeriksaan || "-",
                "Perbaikan": item.perbaikan || "-",
                "Sparepart (Note)": item.sparepart || "-",
                "Status": item.status
            }));
        } else if (reportType === 'billing') {
            exportData = data.map(item => ({
                "No. Kunjungan": item.visit?.visitNumber || "-",
                "No. Invoice": item.invoiceNumber,
                "Tanggal": format(new Date(item.createdAt), "dd/MM/yyyy"),
                "Pelanggan": item.visit?.vehicle?.ownerName || "-",
                "No. HP": item.visit?.vehicle?.phoneNumber || "-",
                "Brand": item.visit?.vehicle?.brand || "-",
                "Merk": item.visit?.vehicle?.model || "-",
                "Mekanik": item.visit?.mechanic?.name || "-",
                "Total": Number(item.totalAmount),
                "Status": item.status
            }));
        } else if (reportType === 'stock') {
            exportData = data.map((item, index) => ({
                "No": index + 1,
                "Kode Item": item.sparePart?.code || '-',
                "Nama Item": item.sparePart?.name || '-',
                "Stok Fisik": item.stokFisik,
                "Stok Logic": item.stokLogic,
                "Satuan": item.sparePart?.unit || 'Pcs'
            }));
        } else if (reportType === 'purchases') {
            exportData = data.map(item => ({
                "Tanggal": format(new Date(item.purchaseDate), "dd/MM/yyyy"),
                "Supplier": item.supplier?.name || "-",
                "No. Ref": item.supplierRefNumber || "-",
                "Item": item.sparePart?.name || "-",
                "Qty": item.quantity,
                "Total": Number(item.costPrice) * item.quantity
            }));
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Laporan");

        const fileName = `Laporan_${reportType}_${startDate}_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success("Laporan berhasil didownload");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{REPORT_TITLES[reportType] || "Laporan"}</h1>
                <p className="text-muted-foreground">Periode: {format(new Date(startDate), "dd/MM/yyyy")} - {format(new Date(endDate), "dd/MM/yyyy")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end bg-gradient-to-br from-sky-900 via-sky-900 to-emerald-900 text-white p-4 rounded-lg border">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Periode</label>
                    <div className="flex items-center gap-2 text-black">
                        <DatePicker
                            date={startDate ? new Date(startDate) : undefined}
                            onSelect={(d) => setStartDate(format(d, "yyyy-MM-dd"))}
                            className="bg-white w-full sm:w-auto"
                        />
                        <span className="text-white font-medium">s/d</span>
                        <DatePicker
                            date={endDate ? new Date(endDate) : undefined}
                            onSelect={(d) => setEndDate(format(d, "yyyy-MM-dd"))}
                            className="bg-white w-full sm:w-auto"
                        />
                    </div>
                </div>
                <Button
                    onClick={fetchData}
                    disabled={loading}
                    variant="ghost"
                    className="border-green-400 text-green-400 hover:bg-green-50 hover:text-green-700"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Tampilkan Data
                </Button>
                <Button
                    variant="secondary"
                    onClick={exportToExcel}
                    disabled={data.length === 0}
                    className="border-green-400 text-green-400 hover:bg-green-50 hover:text-green-700"
                >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>

            <div className="border rounded-md bg-white min-h-[300px]">
                {reportType === 'visits' && <VisitsReportTable data={data} loading={loading} />}
                {reportType === 'billing' && <BillingReportTable data={data} loading={loading} />}
                {reportType === 'stock' && <StockReportTable data={data} loading={loading} />}
                {reportType === 'purchases' && <PurchasesReportTable data={data} loading={loading} />}
            </div>
        </div>
    );
}
