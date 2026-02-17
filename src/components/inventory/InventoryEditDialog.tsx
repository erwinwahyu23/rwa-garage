"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Combobox from "@/components/ui/combobox";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSparePartSchema } from "@/lib/inventory/schemas";
import type { z } from "zod";

type FormType = z.infer<typeof updateSparePartSchema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: any;
  onUpdated?: (item: any) => void;
  // when true, show only code, name and category (used by Master Items page)
  minimal?: boolean;
};

export default function InventoryEditDialog({ open, onOpenChange, item, onUpdated, minimal = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [units, setUnits] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [sellPrices, setSellPrices] = useState<{ brand: string; price: number; note?: string }[]>([]);
  const [newPriceBrand, setNewPriceBrand] = useState("");
  const [newPriceVal, setNewPriceVal] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(updateSparePartSchema),
    defaultValues: item ? {
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit || "Pcs",
      minStock: item.minStock,
      costPrice: item.costPrice,
      version: item.version,
      categoryId: item.categoryId ?? undefined,
    } : undefined,
  });

  useEffect(() => {
    if (open && item?.id) {
      fetch(`/api/inventory/${item.id}`).then(r => r.json()).then(data => {
        if (data && data.sellPrices) setSellPrices(data.sellPrices);
        // also update costPrice if needed
        if (data.costPrice) setValue('costPrice', Number(data.costPrice));
      });
    } else {
      setSellPrices([]);
    }
  }, [open, item, setValue]);

  function onError(errs: any) {
    console.warn('Edit validation failed', errs);
    // show a friendly message
    const firstKey = Object.keys(errs)[0];
    const firstErr = errs[firstKey] as any;
    const msg = firstErr?.message || 'Periksa input, ada kesalahan';
    toast.error(`Validasi ${firstKey}: ${msg}`);
  }

  useEffect(() => {
    if (open) {
      if (item) {
        // Exclude sellPrices from form values to prevent Zod validation error on "string" vs "number" mismatch
        // sellPrices is managed by local state, not react-hook-form
        // Explicitly set only editable fields.
        // We exclude 'stock' because it is not editable here and might be negative (causing validation error).
        reset({
          code: item.code,
          name: item.name,
          category: item.category,
          categoryId: item.categoryId ?? undefined,
          unit: item.unit || "Pcs",
          minStock: item.minStock ?? 0,
          costPrice: item.costPrice ?? 0,
          version: item.version ?? 0,
        });
      } else {
        reset({});
      }
    }
  }, [open, item, reset]);



  async function fetchCategories() {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchCategories();

    fetch("/api/units")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUnits(data);
      })
      .catch(() => { });
  }, [open]);

  // if categories are loaded but the form has no categoryId, try to resolve it from the item's category name
  useEffect(() => {
    if (!open) return;
    const cid = watch('categoryId');
    if (!cid && item?.category && categories.length > 0) {
      const found = categories.find((c) => c.name === item.category);
      if (found) setValue('categoryId', found.id);
    }
  }, [open, categories, item?.category, setValue, watch]);



  async function onSubmit(values: FormType) {
    console.log('InventoryEditDialog onSubmit', values, 'item:', item);
    if (!item) return;
    setLoading(true);
    try {
      // coerce version to a number to satisfy Zod when it may come as a string
      if (typeof (values as any).version === 'string') (values as any).version = Number((values as any).version || 0);

      // Sanitize sellPrices
      const sanitizedSellPrices = sellPrices.map((p: any) => ({
        brand: p.brand,
        price: Number(p.price),
        note: p.note || undefined,
      }));

      // show immediate feedback
      const toastId = toast.loading('Menyimpan...');
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sellPrices: sanitizedSellPrices }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Unknown' }));
        console.warn('Update failed', json);
        if (json.details) {
          console.error('Validation details:', json.details);
          toast.error(`Validasi gagal: ${JSON.stringify(json.details)}`, { id: toastId });
        } else {
          toast.error(json.error || "Failed to increase", { id: toastId });
        }
        return;
      }

      const updated = await res.json();
      onUpdated && onUpdated(updated);
      toast.success('Item diperbarui', { id: toastId });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Spare Part</DialogTitle>
        </DialogHeader>

        {/* ensure version is registered so zod validation receives it */}
        <input type="hidden" defaultValue={item?.version ?? 1} {...register('version', { valueAsNumber: true })} />

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
            <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Informasi Dasar</TabsTrigger>
            <TabsTrigger value="prices" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Harga Jual</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 pt-2">
            <div>
              <label className="text-sm mb-1 block">Code</label>
              <Input id="code" placeholder="Code" {...register("code")} />
              {errors.code && <div className="text-sm text-red-500">{String(errors.code?.message)}</div>}
            </div>

            <div>
              <label className="text-sm mb-1 block">Name</label>
              <Input id="name" placeholder="Name" {...register("name")} />
              {errors.name && <div className="text-sm text-red-500">{String(errors.name?.message)}</div>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-sm mb-1 block">Kategori</label>
                <div className="flex flex-col gap-2">
                  <div className="w-full">
                    <Combobox
                      options={categories}
                      value={watch('categoryId') || ''}
                      onChange={(id) => setValue('categoryId', id)}
                      placeholder="-- Pilih Kategori --"
                      isLoading={categoriesLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    {!addingCategory ? (
                      <button type="button" className="text-xs text-blue-600 underline text-left" onClick={() => setAddingCategory(true)}>+ Buat Kategori Baru</button>
                    ) : (
                      <div className="flex gap-2 items-center w-full">
                        <input className="flex-1 p-2 h-9 border rounded text-sm min-w-0" placeholder="Nama kategori" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        <button type="button" className="h-9 px-3 text-xs bg-blue-600 text-white rounded shrink-0" onClick={async () => {
                          if (!newCategoryName) return;
                          setAddingCategoryLoading(true);
                          try {
                            const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName }) });
                            if (!res.ok) throw new Error('Failed');
                            const created = await res.json();
                            setCategories((s) => [created, ...s]);
                            setValue('categoryId', created.id);
                            setNewCategoryName('');
                            setAddingCategory(false);
                            toast.success('Kategori ditambahkan');
                          } catch (err) {
                            toast.error('Gagal menambahkan kategori');
                          } finally {
                            setAddingCategoryLoading(false);
                          }
                        }}>{addingCategoryLoading ? '...' : 'Add'}</button>
                        <button type="button" className="h-9 px-2 text-xs text-gray-600 border rounded shrink-0 hover:bg-slate-100" onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block">Satuan</label>
                <div className="flex gap-2">
                  <Combobox
                    options={units.map(u => ({ id: u, name: u }))}
                    value={watch("unit")}
                    onChange={(val) => setValue("unit", val || "")}
                    onInput={(val) => {
                      if (!val) return;
                      const match = units.find(u => u.toLowerCase() === val.toLowerCase());
                      setValue("unit", match || val);
                    }}
                    placeholder="Pilih atau ketik satuan..."
                    className="w-full flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block">Min Stock</label>
                <Input id="minStock" placeholder="0" type="number" {...register("minStock", { valueAsNumber: true })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prices" className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Label / Brand</label>
                  <Input
                    value={newPriceBrand}
                    onChange={(e) => setNewPriceBrand(e.target.value)}
                    placeholder="Contoh: UMUM, GOJEK"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Harga Jual</label>
                  <Input
                    type="number"
                    value={newPriceVal}
                    onChange={(e) => setNewPriceVal(e.target.value)}
                    placeholder="Rp 0"
                  />
                </div>
                <Button type="button" size="sm" onClick={() => {
                  if (!newPriceBrand || !newPriceVal) return;
                  setSellPrices([...sellPrices, { brand: newPriceBrand, price: Number(newPriceVal) }]);
                  setNewPriceBrand("");
                  setNewPriceVal("");
                }}>Tambah</Button>
              </div>

              <div className="border rounded-md">
                {sellPrices.length === 0 && <div className="p-4 text-center text-sm text-gray-400">Belum ada harga jual diatur.</div>}
                {sellPrices.map((sp, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-slate-50">
                    <div>
                      <div className="font-medium text-sm">{sp.brand}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(sp.price)}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 h-6 w-6 p-0" onClick={() => {
                      setSellPrices(sellPrices.filter((_, i) => i !== idx));
                    }}>X</Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button className="w-full mt-4 text-white bg-sky-900 hover:bg-sky-700 justify-center" onClick={handleSubmit(onSubmit, onError)} disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
