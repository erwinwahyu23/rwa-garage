import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";

interface StockReportTableProps {
    data: any[];
    loading: boolean;
}

export function StockReportTable({ data, loading }: StockReportTableProps) {
    return (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Kode Item</TableHead>
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Stok Fisik</TableHead>
                    <TableHead>Stok Logic</TableHead>
                    <TableHead>Satuan</TableHead>
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
                        {data.slice(0, 50).map((item: any, index: number) => (
                            <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{item.sparePart?.code}</TableCell>
                                <TableCell>{item.sparePart?.name}</TableCell>
                                <TableCell>{item.stokFisik}</TableCell>
                                <TableCell className={item.stokLogic !== item.stokFisik ? "text-amber-600 font-medium" : ""}>
                                    {item.stokLogic}
                                </TableCell>
                                <TableCell>{item.sparePart?.unit || "Pcs"}</TableCell>
                            </TableRow>
                        ))}
                        {data.length > 50 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
                                    ...dan {data.length - 50} item lainnya (Export ke Excel untuk lihat semua)
                                </TableCell>
                            </TableRow>
                        )}
                    </>
                )}
            </TableBody>
        </Table>
    );
}
