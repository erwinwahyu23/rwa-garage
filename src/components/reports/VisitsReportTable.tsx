import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";

interface VisitsReportTableProps {
    data: any[];
    loading: boolean;
}

export function VisitsReportTable({ data, loading }: VisitsReportTableProps) {
    return (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead>No. Kunjungan</TableHead>
                    <TableHead>Tgl. Kunjungan</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>No. Mesin</TableHead>
                    <TableHead>No. Polisi</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead>Mekanik</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Pemeriksaan</TableHead>
                    <TableHead>Perbaikan</TableHead>
                    <TableHead>Sparepart (Note)</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                            {loading ? "Memuat..." : "Tidak ada data. Klik 'Tampilkan Data'."}
                        </TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.slice(0, 10).map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.visitNumber}</TableCell>
                                <TableCell className="whitespace-nowrap">{format(new Date(item.visitDate), "dd/MM/yyyy")}</TableCell>
                                <TableCell>{item.vehicle?.brand}</TableCell>
                                <TableCell>{item.vehicle?.model}</TableCell>
                                <TableCell className="text-xs">{item.vehicle?.engineNumber}</TableCell>
                                <TableCell className="text-xs">{item.vehicle?.licensePlate}</TableCell>
                                <TableCell>{item.vehicle?.ownerName || "-"}</TableCell>
                                <TableCell>{item.mechanic?.name || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.diagnosis}>{item.diagnosis || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.pemeriksaan}>{item.pemeriksaan || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.perbaikan}>{item.perbaikan || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.sparepart}>{item.sparepart || "-"}</TableCell>
                                <TableCell>{item.status}</TableCell>
                            </TableRow>
                        ))}
                        {data.length > 10 && (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center text-xs text-muted-foreground py-2">
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
