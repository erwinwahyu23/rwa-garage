"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PublicInvoiceClient({ invoice }: { invoice: any }) {
    const visit = invoice.visit;
    const isVoid = invoice.status === "VOID";
    const isPaid = invoice.status === "PAID";
    const lineItems = invoice.invoiceItems || [];

    const subTotal = lineItems.reduce((acc: number, item: any) => acc + Number(item.amount), 0);
    const globalDiscountAmount = subTotal * (Number(invoice.globalDiscount || 0) / 100);
    const dpp = subTotal - globalDiscountAmount;
    const taxAmount = dpp * (Number(invoice.ppn || 0) / 100);
    const grossTotalAmount = Number(invoice.totalAmount);
    const displayedUsedDeposit = Number(invoice.usedDeposit || 0);
    const finalGrandTotal = grossTotalAmount - displayedUsedDeposit;

    function formatQuantity(qty: number) {
        if (qty === Math.floor(qty)) return qty.toString();
        return qty.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }

    function handlePrint() {
        window.print();
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex justify-center print:bg-white print:p-0">
            <div className="w-full max-w-4xl">
                {isVoid && (
                    <div className="mb-4 p-4 bg-red-100 text-red-800 font-semibold text-center rounded print:hidden">
                        Invoice ini telah DIBATALKAN (VOID).
                    </div>
                )}
                <div className="mb-4 flex justify-between items-center print:hidden">
                    <h2 className="text-xl font-bold text-slate-700">Detail Tagihan</h2>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Printer className="w-4 h-4 mr-2" /> Simpan PDF / Cetak
                    </Button>
                </div>

                <Card id="invoice-printable" className="print:shadow-none print:border-none flex flex-col print:min-h-0 print:block overflow-hidden relative">
                    {/* Watermark for VOID */}
                    {isVoid && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                            <span className="text-[150px] font-black text-red-600 rotate-[-45deg] tracking-widest border-8 border-red-600 p-8">VOID</span>
                        </div>
                    )}
                    {isPaid && !isVoid && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                            <span className="text-[120px] font-black text-green-700 rotate-[-45deg] tracking-widest border-8 border-green-700 p-8">LUNAS</span>
                        </div>
                    )}

                    <table className="w-full relative z-10">
                        <thead className="print:table-header-group">
                            <tr>
                                <td>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 px-6 pt-6 print:px-0 gap-4">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <Image src="/logo.png" alt="RWA Garage Logo" width={90} height={90} className="object-contain" priority />
                                            <div>
                                                <div className="font-bold text-xl text-slate-800">RWA GARAGE</div>
                                                <div className="text-xs text-muted-foreground font-small">Jl. Pandawa 1, Legian, Kec. Kuta, Kabupaten Badung, Bali - 80361</div>
                                                <div className="text-xs text-muted-foreground font-small">Email: rwagarage@gmail.com</div>
                                                <div className="text-xs text-muted-foreground font-small">Telp: +62 813-5910-991</div>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right w-full sm:w-auto">
                                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-800">INVOICE</h1>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6 border-b print:px-0">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 text-sm">
                                            <div className="space-y-1">
                                                <div className="grid grid-cols-[110px_auto_1fr] items-center">
                                                    <span className="text-gray-600">No. Invoice</span>
                                                    <span className="font-medium px-2">:</span>
                                                    <span className="font-medium">{invoice.invoiceNumber}</span>
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

                                            <div className="space-y-1">
                                                <div className="grid grid-cols-[120px_auto_1fr] items-center">
                                                    <span className="text-gray-600">Tanggal Cetak</span>
                                                    <span className="font-medium px-2">:</span>
                                                    <span className="font-medium">{format(new Date(), "dd-MMM-yyyy")}</span>
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
                                                    <span className="font-medium font-bold text-slate-800">{invoice.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </thead>

                        <tbody>
                            <tr className="print:break-inside-auto" style={{ pageBreakInside: 'auto', breakInside: 'auto' }}>
                                <td className="print:p-0">
                                    <CardContent className="pt-6 px-6 print:px-0">
                                        <div className="min-h-[200px]">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-slate-100">
                                                        <th className="text-left py-2 pl-2">Deskripsi</th>
                                                        <th className="text-center py-2 w-[80px]">Qty</th>
                                                        <th className="text-right py-2 w-[150px]">Harga</th>
                                                        <th className="text-right py-2 w-[100px]">Diskon</th>
                                                        <th className="text-right py-2 w-[150px] pr-2">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lineItems.map((item: any, idx: number) => (
                                                        <tr key={idx} className="bg-white border-b border-dashed last:border-solid last:border-slate-300 hover:bg-slate-50">
                                                            <td className="py-3 px-2">
                                                                <span>{item.description || item.desc}</span>
                                                                {item.type === 'PART' && <Badge variant="outline" className="ml-2 text-[10px] h-4 py-0 print:hidden">Part</Badge>}
                                                            </td>
                                                            <td className="text-center py-3">
                                                                <span>{formatQuantity(Number(item.quantity))}</span>
                                                            </td>
                                                            <td className="text-right py-3 pr-2 sm:pr-0">
                                                                <span>{Number(item.price).toLocaleString("id-ID")}</span>
                                                            </td>
                                                            <td className="text-right py-3 pr-2 sm:pr-0">
                                                                <span>{Number(item.discount || 0)}%</span>
                                                            </td>
                                                            <td className="text-right py-3 pr-2 font-medium">
                                                                {Number(item.amount).toLocaleString("id-ID")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </td>
                            </tr>

                            <tr className="print:break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                <td className="print:px-0">
                                    <Separator className="my-6 print:my-2" />
                                    <div className="flex flex-col-reverse sm:flex-row justify-end sm:items-end gap-6 sm:gap-0 mt-8 print:mt-4 w-full px-6 print:px-0">
                                        <div className="w-full sm:w-1/2 space-y-2 ml-auto">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(subTotal)}</span>
                                            </div>

                                            {Number(invoice.globalDiscount) > 0 && (
                                                <div className="flex justify-between items-center text-sm mt-1">
                                                    <span className="text-muted-foreground">Diskon Total <span className="text-red-600">({invoice.globalDiscount}%)</span></span>
                                                    <span className="text-red-600">-{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(globalDiscountAmount)}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">PPN <span className="text-slate-500">({invoice.ppn || 0}%)</span></span>
                                                <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(taxAmount)}</span>
                                            </div>

                                            {displayedUsedDeposit > 0 && (
                                                <div className="flex justify-between items-center text-sm pt-2">
                                                    <span className="text-blue-700 font-medium">Deposit Digunakan</span>
                                                    <span className="text-blue-700 font-medium">
                                                        - {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(displayedUsedDeposit)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="border-t border-slate-200 my-1"></div>

                                            <div className="flex justify-between items-center text-lg sm:text-xl font-bold">
                                                <span>Grand Total</span>
                                                <span className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(finalGrandTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Card>

                {/* Print Styles inline for client-side injection */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                        #invoice-printable, #invoice-printable * {
                            visibility: visible;
                        }
                        #invoice-printable {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            border: none;
                            box-shadow: none;
                        }
                    }
                `}} />
            </div>
        </div>
    );
}
