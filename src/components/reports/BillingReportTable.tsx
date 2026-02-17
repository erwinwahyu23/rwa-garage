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
                    <TableHead>No. Kunjungan</TableHead>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Tgl. Invoice</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Mekanik</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                            {loading ? "Memuat..." : "Tidak ada data. Klik 'Tampilkan Data'."}
                        </TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.slice(0, 10).map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.visit?.visitNumber || "-"}</TableCell>
                                <TableCell className="text-xs font-medium">{item.invoiceNumber}</TableCell>
                                <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
                                <TableCell>{item.visit?.vehicle?.ownerName || "-"}</TableCell>
                                <TableCell>{item.visit?.vehicle?.phoneNumber || "-"}</TableCell>
                                <TableCell>{item.visit?.vehicle?.brand || "-"}</TableCell>
                                <TableCell>{item.visit?.vehicle?.model || "-"}</TableCell>
                                <TableCell>{item.visit?.mechanic?.name || "-"}</TableCell>
                                <TableCell>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(item.totalAmount))}</TableCell>
                                <TableCell>{item.status}</TableCell>
                            </TableRow>
                        ))}
                        {data.length > 10 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-2">
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
