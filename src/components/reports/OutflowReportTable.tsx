import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface OutflowReportTableProps {
    data: any[];
    loading: boolean;
}

export function OutflowReportTable({ data, loading }: OutflowReportTableProps) {
    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
                Memuat data pengeluaran barang...
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
                Tidak ada data pengeluaran barang pada periode ini
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-[50px]">No</TableHead>
                        <TableHead>No. Invoice</TableHead>
                        <TableHead>Kode Item</TableHead>
                        <TableHead>Nama Item</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead>Tgl. Keluar</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Merk</TableHead>
                        <TableHead>No. Polisi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-normal">
                                {index + 1}
                            </TableCell>
                            <TableCell className="font-normal">
                                {item.noInv}
                            </TableCell>
                            <TableCell className="font-normal">
                                {item.kode}
                            </TableCell>
                            <TableCell>
                                <span className="font-normal">{item.namaItem}</span>
                            </TableCell>
                            <TableCell className="text-right font-normal">
                                {item.jumlah}
                            </TableCell>
                            <TableCell>
                                {format(new Date(item.tanggalKeluar), "dd MMM yyyy", { locale: idLocale })}
                            </TableCell>
                            <TableCell>{item.brand}</TableCell>
                            <TableCell>{item.merk}</TableCell>
                            <TableCell className="font-mono">
                                {item.noPolisi}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
