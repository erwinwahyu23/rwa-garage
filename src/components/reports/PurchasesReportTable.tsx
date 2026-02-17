import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";

interface PurchasesReportTableProps {
    data: any[];
    loading: boolean;
}

export function PurchasesReportTable({ data, loading }: PurchasesReportTableProps) {
    return (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>No. Ref</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            {loading ? "Memuat..." : "Tidak ada data. Klik 'Tampilkan Data'."}
                        </TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.slice(0, 10).map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell>{format(new Date(item.purchaseDate), "dd/MM/yyyy")}</TableCell>
                                <TableCell>{item.supplier?.name || "-"}</TableCell>
                                <TableCell>{item.supplierRefNumber || "-"}</TableCell>
                                <TableCell>{item.sparePart?.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(item.costPrice) * item.quantity)}</TableCell>
                            </TableRow>
                        ))}
                        {data.length > 10 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
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
