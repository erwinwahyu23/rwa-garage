"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, CreditCard, Ban, FileText, AlertCircle } from "lucide-react";
import Image from "next/image";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Props = {
    invoiceId: string;
};

export default function InvoiceDetailClient({ invoiceId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const visitIdParam = searchParams.get("visitId");
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

    const [invoice, setInvoice] = useState<any>(null);
    const [visit, setVisit] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Config Dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<"PAID" | "VOID" | null>(null);

    const [ppn, setPpn] = useState(0);

    // Initialize
    useEffect(() => {
        async function init() {
            try {
                if (invoiceId === "create" && visitIdParam) {
                    // Fetch Visit to preview
                    const res = await fetch(`/api/diagnosis/${visitIdParam}`);
                    if (!res.ok) throw new Error("Visit not found");
                    const v = await res.json();
                    setVisit(v);
                } else {
                    // Fetch existing invoice
                    const res = await fetch(`/api/billing/invoice/${invoiceId}`);
                    if (!res.ok) throw new Error("Invoice not found");
                    const inv = await res.json();
                    setInvoice(inv);
                    setVisit(inv.visit);
                    // Load PPN if exists
                    if (inv.ppn) setPpn(Number(inv.ppn));
                }
            } catch (err) {
                toast.error("Gagal memuat data");
                router.push("/billing");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [invoiceId, visitIdParam]);

    // Update document title for Print/PDF Filename
    useEffect(() => {
        if (invoice && visit?.vehicle) {
            const plate = (visit.vehicle.licensePlate || "NOPLAT").replace(/\s+/g, '').toUpperCase();
            const parts = [
                invoice.invoiceNumber,
                visit.vehicle.brand,
                visit.vehicle.model
            ].filter(Boolean).join('-').replace(/\s+/g, '-'); // e.g. INV-123-Honda-Jazz-RS

            document.title = `${parts}-${plate}`;
        } else if (invoice?.invoiceNumber) {
            document.title = invoice.invoiceNumber;
        } else {
            document.title = "Invoice - RWA Garage";
        }

        return () => {
            document.title = "RWA Garage";
        }
    }, [invoice, visit]);

    // State for items if creating
    // Structure: { type: 'SERVICE'|'PART', id?: string, desc: string, qty: number, cost: number, price: number, amount: number }
    const [lineItems, setLineItems] = useState<any[]>([]);

    // Search state
    const [searchResults, setSearchResults] = useState<any[]>([]);

    async function handleSearch(q: string) {
        if (!q.trim()) { setSearchResults([]); return; }
        try {
            const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&pageSize=10`);
            const data = await res.json();
            setSearchResults(data.items || []);
        } catch { setSearchResults([]); }
    }

    function addPartItem(part: any) {
        // 1. Try to find match with current vehicle brand
        let bestPrice = Number(part.costPrice) || 0;
        let matched = false;

        const vehicleBrand = visit?.vehicle?.brand || "";

        // Normalize for comparison
        const vBrandNorm = vehicleBrand.toLowerCase();

        if (part.sellPrices && part.sellPrices.length > 0) {
            // Try to find exact or partial match
            const match = part.sellPrices.find((sp: any) => vBrandNorm.includes(sp.brand.toLowerCase()) || sp.brand.toLowerCase().includes(vBrandNorm));
            if (match) {
                bestPrice = Number(match.price);
                matched = true;
            } else {
                // If no match, maybe take the first one or just cost? 
                // Let's default to the first sell price if available, else cost
                bestPrice = Number(part.sellPrices[0].price);
            }
        }

        setLineItems(prev => [
            ...prev,
            {
                type: 'PART',
                id: part.id,
                desc: `${part.code} - ${part.name}`,
                qty: 1,
                cost: Number(part.costPrice) || 0,
                price: bestPrice,
                amount: bestPrice * 1,
                availablePrices: part.sellPrices || [] // Store for UI selector
            }
        ]);
        setSearchResults([]); // Reset search

        if (matched) {
            toast.success(`Harga otomatis disesuaikan untuk ${vehicleBrand}`);
        }
    }

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!loading && !invoice && visit && !initializedRef.current) {
            initializedRef.current = true;
            // Init items for creation
            // 1. Check if visit has structured items (VisitItem)
            if (visit.items && Array.isArray(visit.items) && visit.items.length > 0) {
                const mappedItems = visit.items.map((vi: any) => {
                    // Logic to find best sell price based on vehicle brand (same as addPartItem)
                    let bestPrice = Number(vi.price || 0); // specific price if set in visit

                    if (bestPrice === 0 && vi.sparePart?.sellPrices?.length > 0) {
                        const vehicleBrand = visit.vehicle?.brand?.toLowerCase() || "";
                        const match = vi.sparePart.sellPrices.find((sp: any) =>
                            vehicleBrand.includes(sp.brand.toLowerCase()) ||
                            sp.brand.toLowerCase().includes(vehicleBrand)
                        );
                        if (match) {
                            bestPrice = Number(match.price);
                        } else {
                            bestPrice = Number(vi.sparePart.sellPrices[0].price);
                        }
                    }

                    return {
                        type: 'PART',
                        id: vi.sparePartId,
                        desc: vi.sparePart ? `${vi.sparePart.code} - ${vi.sparePart.name}` : `Item #${vi.id}`,
                        qty: vi.quantity || 1,
                        cost: Number(vi.sparePart?.costPrice || 0),
                        price: bestPrice,
                        amount: (vi.quantity || 1) * bestPrice,
                        availablePrices: vi.sparePart?.sellPrices || []
                    };
                });
                setLineItems(mappedItems);
                if (mappedItems.length > 0) {
                    toast.success("Item dari diagnosis otomatis dimuat");
                }
            } else {
                setLineItems([]);
            }
        } else if (invoice?.items) {
            setLineItems(invoice.items);
        }
    }, [loading, invoice, visit]);

    const subTotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const taxAmount = subTotal * (ppn / 100);
    const totalAmount = subTotal + taxAmount;

    // Updates a line item
    function updateLineItem(index: number, field: string, value: any) {
        const newItems = [...lineItems];
        const item = { ...newItems[index] };

        if (field === 'qty') item.qty = Number(value);
        if (field === 'price') item.price = Number(value);
        if (field === 'desc') item.desc = value;

        // Recalc amount
        item.amount = (item.qty || 0) * (item.price || 0);
        newItems[index] = item;
        setLineItems(newItems);
    }

    // ... submit logic needs to handle new structure 

    async function handleCreateInvoice() {
        if (lineItems.length === 0) {
            toast.error("Minimal 1 item diperlukan untuk membuat invoice");
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/billing/invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    visitId: visit.id,
                    items: lineItems.map(item => ({
                        ...item,
                        sparePartId: item.type === 'PART' ? item.id : undefined // Explicitly map id to sparePartId
                    })),
                    totalAmount,
                    ppn, // Send PPN
                    notes: "Created via Web"
                })
            });
            if (!res.ok) throw new Error();
            const created = await res.json();
            toast.success("Invoice berhasil dibuat");
            router.replace(`/billing/${created.id}`);
            // Update local state to switch to 'view' mode
            setInvoice(created);
        } catch (e) {
            toast.error("Gagal membuat invoice");
        } finally {
            setProcessing(false);
        }
    }

    // ... status update logic same ...
    function initiateUpdateStatus(status: "PAID" | "VOID") {
        setPendingStatus(status);
        setConfirmOpen(true);
    }

    async function handleUpdateStatus() {
        if (!pendingStatus) return;
        const status = pendingStatus;

        setProcessing(true);
        try {
            const res = await fetch(`/api/billing/invoice/${invoice.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, paymentMethod: status === 'PAID' ? 'CASH' : null })
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setInvoice(updated);
            toast.success("Status diperbarui");
        } catch (e) {
            toast.error("Gagal update status");
        } finally {
            setProcessing(false);
            setConfirmOpen(false);
        }
    }

    function handlePrint() {
        window.print();
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!visit) return <div className="p-8 text-center">Data not found</div>;

    const isCreated = !!invoice;
    const isPaid = invoice?.status === "PAID";
    const isVoid = invoice?.status === "VOID";

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body * {
                        visibility: hidden;
                    }
                    #invoice-printable, #invoice-printable * {
                        visibility: visible;
                    }
                    #invoice-printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    }
                    /* Ensure text is black for better contrast */
                    #invoice-printable {
                        color: black;
                    }
                }
            `}</style>

            {/* Header / Actions - Hidden on Print */}
            <div className="flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
                </Button>
                <div className="flex gap-2">
                    {isCreated && (
                        <Button variant="secondary" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" /> Print / PDF
                        </Button>
                    )}
                </div>
            </div>

            {/* Invoice Card */}
            <Card id="invoice-printable" className="print:shadow-none print:border-none flex flex-col print:min-h-0 print:block">
                {/* Wrap everything in a main table to allow repeating headers on print */}
                <table className="w-full">
                    {/* --- REPEATING HEADER --- */}
                    <thead className="print:table-header-group">
                        <tr>
                            <td>
                                <div className="flex justify-between items-center mb-6 px-6 pt-6 print:px-0">
                                    <div className="flex items-center gap-4">
                                        <Image src="/logo.png" alt="RWA Garage Logo" width={60} height={60} className="object-contain" />
                                        <div>
                                            <div className="font-bold text-xl text-slate-800">RWA GARAGE</div>
                                            <div className="text-xs text-muted-foreground font-small">Jl. Pandawa 1, Legian, Kec. Kuta, Kabupaten Badung</div>
                                            <div className="text-xs text-muted-foreground font-small">Bali - 80361</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-4xl font-extrabold tracking-widest text-slate-800">INVOICE</h1>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 border-b print:px-0">
                                    <div className="grid grid-cols-2 gap-8 text-sm">
                                        {/* Left Column */}
                                        <div className="space-y-1">
                                            <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                <span className="text-gray-600">No. Invoice</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{invoice ? invoice.invoiceNumber : "DRAFT"}</span>
                                            </div>
                                            <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                <span className="text-gray-600">Pelanggan</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{visit.vehicle?.ownerName || "-"}</span>
                                            </div>
                                            {visit.vehicle?.phoneNumber && (
                                                <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                    <span className="text-gray-600">No. Telp</span>
                                                    <span className="font-medium px-2">:</span>
                                                    <span className="font-medium">{visit.vehicle.phoneNumber}</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                <span className="text-gray-600">Kendaraan</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{visit.vehicle?.brand} {visit.vehicle?.model}</span>
                                            </div>
                                            <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                <span className="text-gray-600">No. Polisi</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{visit.vehicle?.licensePlate || "-"}</span>
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-1">
                                            <div className="grid grid-cols-[120px_auto_1fr] items-center">
                                                <span className="text-gray-600">Tanggal Cetak</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{format(new Date(), "dd-MMM-yyyy / HH:mm")}</span>
                                            </div>
                                            <div className="grid grid-cols-[120px_auto_1fr] items-center">
                                                <span className="text-gray-600">Kunjungan</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{format(new Date(visit.visitDate), "dd-MMM-yyyy", { locale: idLocale })}</span>
                                            </div>
                                            <div className="grid grid-cols-[120px_auto_1fr] items-center">
                                                <span className="text-gray-600">Mekanik</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">{visit.mechanic?.name || "-"}</span>
                                            </div>
                                            <div className="grid grid-cols-[120px_auto_1fr] items-center">
                                                <span className="text-gray-600">Status Bayar</span>
                                                <span className="font-medium px-2">:</span>
                                                <span className="font-medium">
                                                    {isCreated ? (
                                                        <Badge variant={isPaid ? "default" : isVoid ? "secondary" : "destructive"}
                                                            className={`px-2 py-0 h-5 text-[10px] leading-tight ${invoice.status === 'PENDING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 print:bg-amber-100 print:text-amber-700' : ''}`}
                                                            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                        >
                                                            {invoice.status === 'PENDING' ? 'UNPAID' : invoice.status}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] leading-tight" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>DRAFT</Badge>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </thead>

                    {/* --- MAIN CONTENT --- */}
                    <tbody>
                        <tr>
                            <td>
                                <CardContent className="pt-6 px-6 print:px-0">

                                    {/* Visit Diagnosis Details (Helper for Input) */}
                                    {(!isCreated && isAdmin) && (
                                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3 print:hidden">
                                            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                                <FileText className="h-4 w-4" /> Detail Pengerjaan (Referensi)
                                            </h3>
                                            <div className="space-y-4 text-sm">
                                                {visit.keluhan && (
                                                    <div>
                                                        <span className="font-semibold text-gray-700 block mb-1">Keluhan Awal:</span>
                                                        <div className="bg-white p-2 rounded border text-gray-800">
                                                            {visit.keluhan}
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="font-semibold text-gray-700 block mb-1">Tindakan / Perbaikan:</span>
                                                    <div className="bg-white p-2 rounded border text-gray-800 whitespace-pre-wrap">
                                                        {visit.perbaikan || "-"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-700 block mb-1">Sparepart Digunakan:</span>
                                                    <div className="bg-white p-2 rounded border text-gray-800 whitespace-pre-wrap">
                                                        {visit.items && visit.items.length > 0 ? (
                                                            <ul className="list-disc list-inside">
                                                                {visit.items.map((item: any, idx: number) => (
                                                                    <li key={idx}>
                                                                        {item.quantity}x {item.sparePart?.name || item.name || "Item"}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div className="text-gray-500 italic">- Tidak ada sparepart -</div>
                                                        )}

                                                        {/* Show warning if legacy text exists but structured items are empty (or even if they exist, to be safe, but mostly if empty as per concept) */}
                                                        {visit.sparepart && (!visit.items || visit.items.length === 0) && (
                                                            <div className="mt-2 text-sm text-red-600">
                                                                * Data lama: {visit.sparepart} (Harap input ulang di atas jika perlu restock)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Items Table */}
                                    <div className="min-h-[200px]">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-slate-100">
                                                    <th className="text-left py-2 pl-2">Deskripsi</th>
                                                    <th className="text-center py-2 w-[80px]">Qty</th>
                                                    {!isCreated && isAdmin && <th className="text-right py-2 w-[120px] text-muted-foreground print:hidden">Hrg Beli</th>}
                                                    <th className="text-right py-2 w-[150px]">
                                                        <span className="print:hidden">Hrg Jual</span>
                                                        <span className="hidden print:inline">Hrg Item</span>
                                                    </th>
                                                    <th className="text-right py-2 w-[150px] pr-2">Subtotal</th>
                                                    {!isCreated && isAdmin && <th className="w-[40px] print:hidden"></th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lineItems.map((item, idx) => (
                                                    <tr key={idx} className="bg-white border-b border-dashed last:border-solid last:border-slate-300 hover:bg-slate-50">
                                                        <td className="py-3 px-2">
                                                            {isCreated || !isAdmin || item.type === 'PART' ? (
                                                                <span>{item.desc}</span>
                                                            ) : (
                                                                <input
                                                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                                    value={item.desc}
                                                                    onChange={(e) => updateLineItem(idx, 'desc', e.target.value)}
                                                                />
                                                            )}
                                                            {item.type === 'PART' && <Badge variant="outline" className="ml-2 text-xs h-5 print:hidden">Part</Badge>}
                                                        </td>
                                                        <td className="text-center py-3">
                                                            {isCreated || !isAdmin ? (
                                                                <span>{item.qty}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                                                                />
                                                            )}
                                                        </td>
                                                        {!isCreated && isAdmin && (
                                                            <td className="text-right py-3 text-muted-foreground">
                                                                {item.cost ? item.cost.toLocaleString("id-ID") : "-"}
                                                            </td>
                                                        )}
                                                        <td className="text-right py-3 flex items-center justify-end gap-2">
                                                            {isCreated || !isAdmin ? (
                                                                <span>{item.price.toLocaleString("id-ID")}</span>
                                                            ) : (
                                                                <div className="flex items-center gap-1 w-full">
                                                                    <input
                                                                        type="number"
                                                                        className="w-full text-right bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                                        value={item.price}
                                                                        onChange={(e) => updateLineItem(idx, 'price', e.target.value)}
                                                                    />
                                                                    {item.availablePrices && item.availablePrices.length > 0 && (
                                                                        <div className="relative group">
                                                                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full p-0">
                                                                                <span className="text-xs text-blue-600 font-bold">$</span>
                                                                            </Button>
                                                                            {/* Simple Hover Menu for Prices */}
                                                                            <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-48 bg-white border rounded-md shadow-lg p-1">
                                                                                <div className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-slate-50">Pilih Harga Jual:</div>
                                                                                {item.availablePrices.map((p: any, pIdx: number) => (
                                                                                    <div
                                                                                        key={pIdx}
                                                                                        className="text-xs px-2 py-1.5 hover:bg-slate-100 cursor-pointer flex justify-between"
                                                                                        onClick={() => updateLineItem(idx, 'price', p.price)}
                                                                                    >
                                                                                        <span>{p.brand}</span>
                                                                                        <span className="font-mono">{Number(p.price).toLocaleString('id-ID')}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-right py-3 font-medium">
                                                            {item.amount.toLocaleString("id-ID")}
                                                        </td>
                                                        {!isCreated && isAdmin && (
                                                            <td className="text-right">
                                                                <button className="text-red-500 hover:text-red-700" onClick={() => setLineItems(l => l.filter((_, i) => i !== idx))}>
                                                                    x
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {!isCreated && isAdmin && (
                                            <div className="mt-4 flex gap-4 items-start border-t pt-4">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium mb-2">Tambah Sparepart (Master Data)</p>
                                                    <div className="relative">
                                                        <input
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            placeholder="Cari sparepart (kode/nama)..."
                                                            onChange={(e) => handleSearch(e.target.value)}
                                                        />
                                                        {searchResults.length > 0 && (
                                                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                                {searchResults.map(res => (
                                                                    <div key={res.id}
                                                                        className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                                                                        onClick={() => addPartItem(res)}
                                                                    >
                                                                        <span>{res.code} - {res.name}</span>
                                                                        <span className="text-xs text-muted-foreground">Stok: {res.stock}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-1/3 pt-7">
                                                    <Button variant="secondary" className="w-full" onClick={() => setLineItems([...lineItems, { type: 'SERVICE', desc: "Biaya Jasa", qty: 1, cost: 0, price: 0, amount: 0 }])}>
                                                        + Biaya Lain (Jasa)
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                </CardContent>
                            </td>
                        </tr>

                        {/* Footer Section - Prints once at the very end of all items */}
                        <tr className="print:break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                            <td className="print:px-0">
                                <Separator className="my-6 print:my-2" />

                                <div className="flex justify-between items-end mt-8 print:mt-4 w-full">
                                    {/* Invoice Footer (Printed By) placed at the bottom left */}
                                    <div className="pt-12 text-sm font-medium">
                                        <div className="grid grid-cols-[80px_auto_1fr] items-center text-left">
                                            <span className="text-gray-600">Printed by</span>
                                            <span className="px-2">:</span>
                                            <span>{session?.user?.name || "Admin"}</span>
                                        </div>
                                    </div>

                                    {/* Totals Section */}
                                    <div className="w-1/2 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(subTotal)}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">PPN</span>
                                                {(!isCreated && isAdmin) ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            className="w-12 text-center border rounded px-1 py-0.5 text-xs"
                                                            value={ppn}
                                                            onChange={(e) => setPpn(Math.max(0, Number(e.target.value)))}
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ) : (
                                                    <span>({ppn}%)</span>
                                                )}
                                            </div>
                                            <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(taxAmount)}</span>
                                        </div>

                                        <div className="border-t-1 border-slate-200 my-1"></div>

                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>Grand Total</span>
                                            <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Actions (Admin Only & Not Print) */}
                {!isVoid && isAdmin && (
                    <CardFooter className="bg-slate-50 border-t p-6 flex justify-end gap-3 print:hidden">
                        {!isCreated ? (
                            <Button variant="secondary" onClick={handleCreateInvoice} disabled={processing || lineItems.length === 0}>
                                Simpan & Buat Invoice
                            </Button>
                        ) : (
                            <>
                                {!isPaid && (
                                    <Button variant="destructive" onClick={() => initiateUpdateStatus("VOID")} disabled={processing}>
                                        <Ban className="h-4 w-4 mr-2" /> Batalkan INV
                                    </Button>
                                )}
                                {!isPaid && (
                                    <Button className="bg-green-600 text-white hover:bg-green-700 hover:text-white focus-visible:ring-green-600 hover:focus-visible:ring-green-700"
                                        onClick={() => initiateUpdateStatus("PAID")} disabled={processing}>
                                        <CreditCard className="h-4 w-4 mr-2" /> Tandai Lunas
                                    </Button>
                                )}
                            </>
                        )}
                    </CardFooter>
                )}
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .card, .card *, .card-content, .card-content * {
                        visibility: visible;
                    }
                    .card {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        border: none;
                        box-shadow: none;
                    }
                }
            `}</style>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingStatus === 'PAID' ? "Konfirmasi Pembayaran" : "Batalkan Invoice"}
                description={`Apakah Anda yakin ingin mengubah status menjadi ${pendingStatus}? Stok akan ${pendingStatus === 'PAID' ? 'dikurangi' : 'dikembalikan'} secara otomatis.`}
                confirmText={pendingStatus === 'PAID' ? "Ya, Tandai Lunas" : "Ya, Batalkan"}
                variant={pendingStatus === 'VOID' ? 'destructive' : 'default'}
                onConfirm={handleUpdateStatus}
                loading={processing}
            />
        </div>
    );
}
