"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Search, Plus, User, FileText } from "lucide-react";
import SupplierFormDialog from "./SupplierFormDialog";
import SupplierHistoryDialog from "./SupplierHistoryDialog";
import PaginationControls from "@/components/shared/PaginationControls";

type Supplier = {
    id: string;
    name: string;
    contact?: string;
    hasItems?: boolean;
};

export default function SupplierList() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const PAGE_SIZE = 100;

    // Edit/Create State
    const [formOpen, setFormOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

    // Debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchSuppliers = () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("pageSize", PAGE_SIZE.toString());
        if (debouncedSearch) params.set("q", debouncedSearch);

        fetch(`/api/suppliers?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setSuppliers(data.items || []);
                setTotalItems(data.total || 0);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSuppliers();
    }, [page, debouncedSearch]);

    const handleEdit = (s: Supplier, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditSupplier(s);
        setFormOpen(true);
    };

    const handleHistory = (s: Supplier, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedSupplier(s);
    }

    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari supplier..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={() => { setEditSupplier(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Supplier Baru
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100 border-b">
                            <TableHead>Nama Supplier</TableHead>
                            <TableHead>Kontak/No. Telp</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    Memuat data...
                                </TableCell>
                            </TableRow>
                        ) : suppliers && suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    Tidak ada supplier yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((s) => (
                                <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => setSelectedSupplier(s)}>
                                    <TableCell className="font-medium group-hover:text-blue-600 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                                            {s.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{s.contact || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu modal={false}>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="min-w-[220px]">
                                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={(e) => handleEdit(s, e)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit Nama
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleHistory(s, e)}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Riwayat Pembelian
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                loading={loading}
                itemName="supplier"
            />

            <SupplierHistoryDialog
                open={!!selectedSupplier}
                onOpenChange={(open) => !open && setSelectedSupplier(null)}
                supplier={selectedSupplier}
            />

            <SupplierFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                existingSupplier={editSupplier}
                onSuccess={fetchSuppliers}
            />
        </div>
    );
}
