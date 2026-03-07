import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";

interface BillingReportTableProps {
    data: any[];
    loading: boolean;
}

export function BillingReportTable({ data, loading }: BillingReportTableProps) {
    return (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead className="w-[100px]">No. Kunjungan</TableHead>
                    <TableHead className="w-[120px]">No. Invoice</TableHead>
                    <TableHead className="w-[90px]">Tgl. Invoice</TableHead>
                    <TableHead className="w-[100px]">Pelanggan</TableHead>
                    <TableHead className="w-[80px]">Brand</TableHead>
                    <TableHead className="w-[80px]">Merk</TableHead>
                    <TableHead className="w-[100px]">Mekanik</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total Pembelian</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total Penjualan</TableHead>
                    <TableHead className="text-right">Jasa</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Selisih</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total Bill</TableHead>
                    <TableHead className="text-center w-[80px]">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                            {loading ? "Memuat..." : "Tidak ada data. Klik 'Tampilkan Data'."}
                        </TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.slice(0, 10).map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs whitespace-nowrap">{item.visit?.visitNumber || "-"}</TableCell>
                                <TableCell className="text-xs font-medium whitespace-nowrap text-blue-600">{item.invoiceNumber}</TableCell>
                                <TableCell className="text-xs">{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
                                <TableCell className="text-xs truncate max-w-[100px]">{item.visit?.vehicle?.ownerName || "-"}</TableCell>
                                <TableCell className="text-xs truncate max-w-[80px]">{item.visit?.vehicle?.brand || "-"}</TableCell>
                                <TableCell className="text-xs truncate max-w-[80px]">{item.visit?.vehicle?.model || "-"}</TableCell>
                                <TableCell className="text-xs truncate max-w-[100px]">{item.visit?.mechanic?.name || "-"}</TableCell>
                                <TableCell className="text-right text-xs whitespace-nowrap text-red-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.totalBeli || 0))}</TableCell>
                                <TableCell className="text-right text-xs whitespace-nowrap font-medium">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.totalJualBarang || 0))}</TableCell>
                                <TableCell className="text-right text-xs whitespace-nowrap font-medium text-purple-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.totalJasa || 0))}</TableCell>
                                <TableCell className="text-right text-xs whitespace-nowrap font-bold text-green-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.selisih || 0))}</TableCell>
                                <TableCell className="text-right text-xs whitespace-nowrap font-bold underline decoration-slate-300">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.totalAmount || 0))}</TableCell>
                                <TableCell className="text-center text-xs">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${item.status === 'PAID' ? 'bg-green-100 text-green-800' : item.status === 'VOID' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {item.status}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length > 10 && (
                            <TableRow>
                                <TableCell colSpan={14} className="text-center text-xs text-muted-foreground py-2">
                                    ...dan {data.length - 10} baris lainnya (Export ke Excel untuk lihat semua)
                                </TableCell>
                            </TableRow>
                        )}
                    </>
                )}
            </TableBody>
        </Table>
    );
}
