"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import * as schemas from "@/lib/inventory/schemas";
import type { z } from "zod";
import Combobox from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DatePicker } from "@/components/shared/DatePicker";

type FormType = z.infer<typeof schemas.createPurchasesSchema>;
type IdName = { id: string; name: string };

// Initial state for the "Staging" input
const INITIAL_STAGING = {
  sparePartId: "",
  sparePartCode: "",
  sparePartName: "", // For manual entry or display
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  categoryId: "", // For manual entry new items
};

export default function PurchaseCreatePage({
  initialData,
  isEditMode = false,
  originalRef
}: {
  initialData?: FormType;
  isEditMode?: boolean;
  originalRef?: { supplierId: string; ref: string };
}) {
  const router = useRouter();
  const [supplierOptions, setSupplierOptions] = useState<IdName[]>([]);
  const [categories, setCategories] = useState<IdName[]>([]);

  // Header inline add supplier
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplierLoading, setAddingSupplierLoading] = useState(false);

  // Staging state (New Item Input)
  const [staging, setStaging] = useState(INITIAL_STAGING);
  // Staging search results
  const [stagingSearchResults, setStagingSearchResults] = useState<any[]>([]);
  // Staging category add
  const [addingStagingCategory, setAddingStagingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);

  /* ================= FORM (Main Data) ================= */
  const form = useForm<FormType>({
    resolver: zodResolver(schemas.createPurchasesSchema),
    mode: "onChange",
    defaultValues: initialData || {
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      supplierId: "",
      supplierRefNumber: "",
      items: [],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const supplierId = watch("supplierId");
  const supplierRefNumber = watch("supplierRefNumber");
  const purchaseDate = watch("purchaseDate");
  const items = watch("items");

  // Header Ready Calculation
  const headerReady = useMemo(() => {
    return Boolean(purchaseDate && supplierId?.length > 0 && supplierRefNumber?.length > 0);
  }, [purchaseDate, supplierId, supplierRefNumber]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    fetch("/api/suppliers?pageSize=1000").then(r => r.json()).then(data => setSupplierOptions(data.items || [])).catch(() => setSupplierOptions([]));
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => setCategories([]));
  }, []);

  // Update form if initialData changes late (e.g. valid fetch)
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  /* ================= STAGING LOGIC ================= */
  // Computed values for Staging
  const stagingDiscountAmount = (staging.unitPrice || 0) * (staging.discountPercent / 100);
  const stagingNetPrice = (staging.unitPrice || 0) - stagingDiscountAmount;
  const stagingTotal = staging.quantity * stagingNetPrice;

  // Search logic
  async function handleSearchStaging(q: string) {
    if (!q.trim()) {
      setStagingSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&page=1&pageSize=10`);
      const data = await res.json();
      setStagingSearchResults(data?.items ?? data ?? []);
    } catch {
      setStagingSearchResults([]);
    }
  }

  // Select logic
  function handleSelectStaging(id: string) {
    const found = stagingSearchResults.find(x => x.id === id);
    if (found) {
      setStaging(prev => ({
        ...prev,
        sparePartId: found.id,
        sparePartCode: found.code,
        sparePartName: found.name,
        categoryId: found.categoryId || "",
        unitPrice: Number(found.costPrice) || 0, // Suggest existing cost price
      }));
    } else {
      // If cleared
      setStaging(prev => ({ ...prev, sparePartId: "", sparePartCode: "", sparePartName: "" }));
    }
  }

  // Add Button Logic
  function handleAddItem() {
    // Validation
    if (!staging.sparePartId && (!staging.sparePartCode || !staging.sparePartName)) {
      toast.error("Pilih barang atau isi Kode & Nama barang");
      return;
    }
    if (staging.quantity <= 0) {
      toast.error("Qty harus lebih dari 0");
      return;
    }
    // If new item (manual), category is required
    if (!staging.sparePartId && !staging.categoryId) {
      toast.error("Kategori wajib diisi untuk barang baru");
      return;
    }

    // Append to Form
    append({
      sparePartId: staging.sparePartId || undefined,
      sparePartCode: staging.sparePartCode,
      sparePartName: staging.sparePartName,
      quantity: staging.quantity,
      unitPrice: staging.unitPrice,
      discountPercent: staging.discountPercent,
      discount: stagingDiscountAmount,
      costPrice: stagingNetPrice,
      categoryId: staging.categoryId || undefined,
      category: categories.find(c => c.id === staging.categoryId)?.name,
    } as any);

    // Reset Staging (keep Category?)
    setStaging({ ...INITIAL_STAGING, categoryId: "" }); // Clear all
    toast.success("Item ditambahkan ke daftar");
  }

  /* ================= INLINE HELPERS =========== */
  async function createSupplier() {
    if (!newSupplierName.trim()) return;
    setAddingSupplierLoading(true);
    try {
      const res = await fetch("/api/suppliers", { method: "POST", body: JSON.stringify({ name: newSupplierName }), headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSupplierOptions(s => [created, ...s]);
      setValue("supplierId", created.id);
      setAddingSupplier(false);
      setNewSupplierName("");
      toast.success("Supplier created");
    } catch { toast.error("Failed to create supplier"); } finally { setAddingSupplierLoading(false); }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategoryLoading(true);
    try {
      const res = await fetch("/api/categories", { method: "POST", body: JSON.stringify({ name: newCategoryName }), headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setCategories(s => [created, ...s]);
      setStaging(s => ({ ...s, categoryId: created.id }));
      setAddingStagingCategory(false);
      setNewCategoryName("");
      toast.success("Category created");
    } catch { toast.error("Failed to create category"); } finally { setAddingCategoryLoading(false); }
  }


  /* ================= GRAND TOTAL =========== */
  const grandTotal = useMemo(() => {
    return (items || []).reduce((acc: number, item: any) => {
      const qty = Number(item.quantity) || 0;
      // We rely on the stored 'costPrice' (Net) which implies unitPrice - discount
      // Or recalculate here to be safe
      const net = (Number(item.unitPrice) || 0) - (Number(item.discount) || 0);
      return acc + (qty * net);
    }, 0);
  }, [items]);


  /* ================= SUBMIT =========== */
  async function submitAll(values: FormType) {
    if (values.items.length === 0) {
      toast.error("Daftar item masih kosong");
      return;
    }
    try {
      // Prepare Payload with Time
      const payload = { ...values };
      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (payload.purchaseDate === todayStr) {
        payload.purchaseDate = new Date().toISOString();
      }

      if (isEditMode && originalRef) {
        const params = new URLSearchParams();
        params.set("supplierId", originalRef.supplierId);
        params.set("ref", originalRef.ref);

        const res = await fetch(`/api/inventory/purchases/group?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Pembelian berhasil diperbarui");
        router.push("/inventory?tab=purchases"); // Redirect to history or dashboard
      } else {
        const res = await fetch("/api/inventory/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Pembelian berhasil disimpan");
        reset();
        setStaging(INITIAL_STAGING);
      }
    } catch (e) {
      toast.error(isEditMode ? "Gagal memperbarui pembelian" : "Gagal menyimpan pembelian");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditMode ? "Edit Pembelian" : "Input Pembelian"}</h1>
      </div>

      {/* HEADER SECTION */}
      {/* HEADER SECTION */}
      <Card className="bg-gradient-to-br from-sky-900 via-sky-900 to-emerald-900 shadow-sm border-none">
        <CardHeader>
          <CardTitle className="text-white">Informasi Faktur</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1 text-white">Tanggal</label>
            <DatePicker
              date={purchaseDate ? new Date(purchaseDate) : undefined}
              onSelect={(d: Date) => setValue("purchaseDate", format(d, "yyyy-MM-dd"), { shouldValidate: true })}
              className="w-full bg-white text-black"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1 text-white">Supplier</label>
            <div className="flex gap-2">
              <Combobox
                options={supplierOptions}
                value={supplierId || ""}
                onChange={id => setValue("supplierId", id || "", { shouldValidate: true })}
                placeholder="Pilih Supplier"
                className="h-9 bg-white text-black"
              />
              {!addingSupplier ? (
                <Button variant="secondary" size="icon" type="button" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setAddingSupplier(true)}>+</Button>
              ) : (
                <div className="absolute z-10 bg-white border p-2 rounded shadow flex gap-1 items-center">
                  <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Nama" className="w-32 h-8" />
                  <Button size="sm" onClick={createSupplier} disabled={addingSupplierLoading}>OK</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingSupplier(false)}>X</Button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1 text-white">No. Referensi</label>
            <Input {...register("supplierRefNumber")} placeholder="Contoh: INV-001" className="h-9 bg-white text-black" />
          </div>
        </CardContent>
      </Card>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* STAGING AREA (Left - Smaller) */}
        <Card className={`lg:col-span-4 ${!headerReady ? "opacity-50 pointer-events-none" : ""}`}>
          <CardHeader>
            <CardTitle className="text-base">Input Barang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Item Search */}
            <div>
              <label className="text-sm font-medium block mb-1">Cari Barang</label>
              <Combobox
                options={stagingSearchResults.map(r => ({ id: r.id, name: `${r.code} - ${r.name}` }))}
                value={staging.sparePartId}
                onInput={handleSearchStaging}
                onChange={(id) => handleSelectStaging(id || "")}
                placeholder="Ketik kode/nama..."
                className="w-full"
              />
            </div>

            {/* Row 2: Manual Code/Name (If needed) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-sm font-medium block mb-1">Kode</label>
                <Input
                  value={staging.sparePartCode}
                  onChange={e => setStaging(prev => ({ ...prev, sparePartCode: e.target.value }))}
                  readOnly={!!staging.sparePartId}
                  placeholder={!!staging.sparePartId ? "Auto" : "Manual"}
                  className={!!staging.sparePartId ? "bg-slate-100" : ""}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Nama</label>
                <Input
                  value={staging.sparePartName}
                  onChange={e => setStaging(prev => ({ ...prev, sparePartName: e.target.value }))}
                  readOnly={!!staging.sparePartId}
                  placeholder={!!staging.sparePartId ? "Auto" : "Manual"}
                  className={!!staging.sparePartId ? "bg-slate-100" : ""}
                />
              </div>
            </div>

            {/* Row 3: Category */}
            <div>
              <label className="text-sm font-medium block mb-1">Kategori</label>
              <div className="flex gap-1">
                <Combobox
                  options={categories}
                  value={staging.categoryId || ""}
                  onChange={id => setStaging(prev => ({ ...prev, categoryId: id || "" }))}
                  disabled={!!staging.sparePartId && Boolean(staging.categoryId)}
                  className="w-full"
                />
                {!staging.sparePartId && (
                  !addingStagingCategory ? (
                    <Button variant="secondary" size="icon" type="button" onClick={() => setAddingStagingCategory(true)}>+</Button>
                  ) : (
                    <div className="absolute z-10 bg-white border p-2 rounded shadow flex gap-1 items-center">
                      <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama" className="w-24 h-8" />
                      <Button size="sm" onClick={createCategory} disabled={addingCategoryLoading}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingStagingCategory(false)}>X</Button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Row 4: Qty & Unit Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium block mb-1">Qty</label>
                <Input
                  type="number"
                  value={staging.quantity}
                  onChange={e => setStaging(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Hrg Satuan</label>
                <Input
                  type="number"
                  value={staging.unitPrice}
                  onChange={e => setStaging(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Row 5: Discount & Total */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-1">
                <label className="text-sm font-medium block mb-1">Diskon (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={staging.discountPercent}
                  onChange={e => setStaging(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                  className="h-10"
                />
              </div>

              {/* Total Row */}
              <div className="col-span-2 flex justify-between items-center bg-slate-50 px-3 rounded border h-10">
                <span className="text-sm text-muted-foreground">Total Item:</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat("id-ID").format(stagingTotal)}
                </span>
              </div>
            </div>

            <Button type="button" onClick={handleAddItem} className="w-full text-white bg-sky-900 hover:bg-sky-700">
              + Tambahkan Items
            </Button>
          </CardContent>
        </Card>

        {/* ITEMS TABLE (Right - Larger) */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Daftar Barang Pembelian</CardTitle>
              <div className="text-sm text-muted-foreground">
                Total Barang: {items.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Hrg</TableHead>
                  <TableHead className="text-right">Disc</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, idx) => {
                  const item = items[idx] || field;
                  const net = (Number(item.unitPrice) || 0) - (Number(item.discount) || 0);
                  const rowTotal = (Number(item.quantity) || 0) * net;

                  return (
                    <TableRow key={field.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{item.sparePartCode}</TableCell>
                      <TableCell>{item.sparePartName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{Number(item.unitPrice).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right">{Number(item.discountPercent || 0)}%</TableCell>
                      <TableCell className="text-right font-medium">{rowTotal.toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => remove(idx)}>
                          X
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-black/40">
                      Belum ada barang di daftar. Silakan input barang di samping.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* TABLE FOOTER / GRAND TOTAL */}
            <div className="mt-6 flex flex-col md:flex-row justify-end items-end md:items-center gap-2 md:gap-4 border-t pt-4">
              <span className="text-sm md:text-lg text-muted-foreground font-medium">Grand Total:</span>
              <span className="text-xl md:text-3xl font-bold">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(grandTotal)}
              </span>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => { reset(); setStaging(INITIAL_STAGING); }}>Reset Form</Button>
              <Button
                type="button"
                onClick={handleSubmit(submitAll, (errors) => {
                  toast.error("Gagal menyimpan: Periksa input data");
                })}
                disabled={!headerReady || items.length === 0}
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white focus-visible:ring-green-600 hover:focus-visible:ring-green-700"
              >
                {isEditMode ? "Simpan Perubahan" : "Simpan Pembelian"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
