"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combobox";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as schemas from "@/lib/inventory/schemas";
import type { z } from "zod";



export default function PurchaseCreateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: (p: any) => void }) {
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  // inline add UI state for supplier/category
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplierLoading, setAddingSupplierLoading] = useState(false);
  // inline add UI for categories (used in item rows)
  const [addingCategoryFor, setAddingCategoryFor] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);
  // header step state
  const [step, setStep] = useState<1 | 2>(1);
  const [headerData, setHeaderData] = useState<{ supplierId: string; supplierRefNumber: string; purchaseDate: string } | null>(null);

  // header form
  const headerForm = useForm<{ supplierId: string; supplierRefNumber: string; purchaseDate: string }>({
    resolver: zodResolver(schemas.createPurchasesSchema.pick({ supplierId: true, supplierRefNumber: true, purchaseDate: true })) as any,
    mode: 'onChange',
    defaultValues: { purchaseDate: new Date().toISOString().slice(0, 10), supplierId: '', supplierRefNumber: '' },
  });

  // items form (field array)
  const itemsForm = useForm<{ items: Array<z.infer<typeof schemas.createPurchaseSchema>> }>({
    resolver: zodResolver(schemas.createPurchasesSchema.pick({ items: true })) as any,
    mode: 'onChange',
    defaultValues: { items: [] },
  });

  const { control, register, handleSubmit, setValue, watch, reset } = itemsForm;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) {
      setStep(1);
      setHeaderData(null);
      headerForm.reset({ purchaseDate: new Date().toISOString().slice(0, 10), supplierId: '', supplierRefNumber: '' });
      itemsForm.reset({ items: [] });
      setAddingSupplier(false); setNewSupplierName('');
      setSupplierOptions([]); setCategories([]);
    }
  }, [open]);

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => setSupplierOptions(d || [])).catch(() => { });
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d || [])).catch(() => { });
  }, []);

  // per-row results state keyed by field id
  const [rowResults, setRowResults] = useState<Record<string, any[]>>({});
  // form-level submit error for the items step
  const [submitError, setSubmitError] = useState<string | null>(null);

  // clear submitError whenever items change
  useEffect(() => {
    const sub = watch('items');
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch('items')]);

  async function searchRow(fieldId: string, q: string) {
    if (!q) {
      setRowResults((s) => ({ ...s, [fieldId]: [] }));
      return;
    }
    try {
      const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&page=1&pageSize=10`);
      const data = await res.json();
      setRowResults((s) => ({ ...s, [fieldId]: data.items ?? data ?? [] }));
    } catch (err) {
      setRowResults((s) => ({ ...s, [fieldId]: [] }));
    }
  }

  function onSelectRow(fieldId: string, index: number, id?: string) {
    if (!id) {
      setValue(`items.${index}.sparePartId`, '' as any);
      return;
    }
    const found = (rowResults[fieldId] || []).find(x => x.id === id);
    setValue(`items.${index}.sparePartId`, found?.id as any);
    // prefill code/name/category for convenience
    if (found) {
      setValue(`items.${index}.sparePartCode`, found.code as any);
      setValue(`items.${index}.sparePartName`, found.name as any);
      setValue(`items.${index}.categoryId`, found.categoryId ?? undefined as any);
    }
  }

  function handleHeaderNext(data: { supplierId: string; supplierRefNumber: string; purchaseDate: string }) {
    setHeaderData(data);
    setStep(2);
  }

  async function submitAll(values: { items: any[] }) {
    if (!headerData) return;

    // validate: new items (no sparePartId) with code/name must have category
    for (const it of values.items) {
      const isNewItem = !it.sparePartId && (it.sparePartCode || it.sparePartName);
      if (isNewItem && !it.categoryId) {
        setSubmitError('Kategori harus diisi untuk item baru');
        return;
      }
    }

    try {
      const payload = {
        supplierId: headerData.supplierId,
        supplierRefNumber: headerData.supplierRefNumber,
        purchaseDate: headerData.purchaseDate,
        items: values.items.map((it) => ({
          sparePartId: it.sparePartId || undefined,
          sparePartCode: it.sparePartCode || undefined,
          sparePartName: it.sparePartName || undefined,
          quantity: Number(it.quantity || 0),
          costPrice: Number(it.costPrice || 0),
          categoryId: it.categoryId || undefined,
        })),
      };

      const res = await fetch('/api/inventory/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Unknown' }));
        toast.error(j?.error || 'Gagal membuat pembelian');
        return;
      }
      const data = await res.json();
      toast.success('Pembelian tercatat');
      onCreated && onCreated(data);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat pembelian');
    }
  }

  function renderRow(f: any, idx: number) {
    const isSelected = Boolean(watch(`items.${idx}.sparePartId`));
    const isRowReadOnly = isSelected || Boolean((f as any)._readOnly);

    return (
      <div key={f.id} className="p-3 border rounded">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Item #{idx + 1}</div>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="destructive" onClick={() => remove(idx)}>Remove</Button>
          </div>
        </div>

        <div className="mt-2">
          <label className="text-sm mb-1 block">Cari (kode atau nama)</label>
          <Combobox
            options={(rowResults[f.id] || []).map(r => ({ id: r.id, name: `${r.code} — ${r.name}` }))}
            value={watch(`items.${idx}.sparePartId`) ?? ''}
            onInput={(q) => searchRow(f.id, q)}
            onChange={(id) => onSelectRow(f.id, idx, id)}
            placeholder="Ketik kode atau nama..."
          />
        </div>

        {/* Manual fields (optional) - Kode, Nama (single column) */}
        <div className="mt-2 grid grid-cols-1 gap-2">
          <div>
            <label className="text-sm mb-1 block">Kode Barang</label>
            <Input {...register(`items.${idx}.sparePartCode` as const)} readOnly={isRowReadOnly} />
          </div>
          <div>
            <label className="text-sm mb-1 block">Nama Barang</label>
            <Input {...register(`items.${idx}.sparePartName` as const)} readOnly={isRowReadOnly} />
          </div>
        </div>

        {/* Kategori */}
        <div className="mt-2">
          <label className="text-sm mb-1 block">Kategori</label>
          <div className="flex gap-2">
            <div className="w-full">
              <Combobox options={categories.map(c => ({ id: c.id, name: c.name }))} value={watch(`items.${idx}.categoryId`) ?? ''} onChange={(id) => setValue(`items.${idx}.categoryId` as const, id as any)} placeholder="-- Pilih Kategori --" disabled={isRowReadOnly} />
            </div>

            {!isRowReadOnly && (
              <div className="flex flex-col gap-1">
                {addingCategoryFor !== f.id ? (
                  <button type="button" className="text-xs text-blue-600 underline" onClick={() => { setAddingCategoryFor(f.id); setNewCategoryName(''); }}>Tambah</button>
                ) : (
                  <div className="flex gap-1 items-center">
                    <input className="p-1 border rounded text-sm" placeholder="Nama kategori" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    <button type="button" className="text-xs bg-blue-600 text-white px-2 py-1 rounded" onClick={async () => {
                      if (!newCategoryName) return;
                      setAddingCategoryLoading(true);
                      try {
                        const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName }) });
                        if (!res.ok) throw new Error('Failed');
                        const created = await res.json();
                        setCategories((s) => [created, ...s]);
                        setValue(`items.${idx}.categoryId` as const, created.id as any);
                        setNewCategoryName('');
                        setAddingCategoryFor(null);
                        toast.success('Kategori ditambahkan');
                      } catch (err) {
                        toast.error('Gagal menambahkan kategori');
                      } finally {
                        setAddingCategoryLoading(false);
                      }
                    }}>{addingCategoryLoading ? 'Menambah...' : 'Add'}</button>
                    <button type="button" className="text-xs text-gray-600" onClick={() => { setAddingCategoryFor(null); setNewCategoryName(''); }}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm mb-1 block">Jumlah</label>
            <Input type="number" {...register(`items.${idx}.quantity` as const, { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm mb-1 block">Harga</label>
            <Input type="number" {...register(`items.${idx}.costPrice` as const, { valueAsNumber: true })} />
          </div>
        </div>


      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader><DialogTitle>Tambah Pembelian</DialogTitle></DialogHeader>

        {step === 1 ? (
          <form onSubmit={headerForm.handleSubmit(handleHeaderNext)}>
            <div>
              <label className="text-sm mb-1 block">Tanggal</label>
              <Input type="date" {...headerForm.register('purchaseDate')} />
            </div>

            <div className="mt-2">
              <label className="text-sm mb-1 block">Supplier</label>
              <div className="flex gap-2">
                <div className="w-full">
                  <Combobox options={supplierOptions.map(s => ({ id: s.id, name: s.name }))} value={headerForm.watch('supplierId') ?? ''} onChange={(id) => headerForm.setValue('supplierId', id as any)} placeholder="-- Pilih Supplier --" />
                </div>

                <div className="flex flex-col gap-1">
                  {!addingSupplier ? (
                    <button type="button" className="text-xs text-blue-600 underline" onClick={() => setAddingSupplier(true)}>Tambah</button>
                  ) : (
                    <div className="flex gap-1 items-center">
                      <input className="p-1 border rounded text-sm" placeholder="Nama supplier" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                      <button type="button" className="text-xs bg-blue-600 text-white px-2 py-1 rounded" onClick={async () => {
                        if (!newSupplierName) return;
                        setAddingSupplierLoading(true);
                        try {
                          const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newSupplierName }) });
                          if (!res.ok) throw new Error('Failed');
                          const created = await res.json();
                          setSupplierOptions((s) => [created, ...s]);
                          headerForm.setValue('supplierId', created.id as any);
                          setNewSupplierName('');
                          setAddingSupplier(false);
                          toast.success('Supplier ditambahkan');
                        } catch (err) {
                          toast.error('Gagal menambahkan supplier');
                        } finally {
                          setAddingSupplierLoading(false);
                        }
                      }}>{addingSupplierLoading ? 'Menambah...' : 'Add'}</button>
                      <button type="button" className="text-xs text-gray-600" onClick={() => { setAddingSupplier(false); setNewSupplierName(''); }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <label className="text-sm mb-1 block">Nomor Referensi Supplier</label>
              <Input {...headerForm.register('supplierRefNumber')} />
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={() => onOpenChange(false)} variant="destructive">Batal</Button>
              <Button type="submit" disabled={!headerForm.formState.isValid}>Lanjutkan (Tambah Item)</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit(submitAll)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => { setStep(1); }}>Back</Button>
                <Button type="button" onClick={() => append({ sparePartId: '', sparePartCode: '', sparePartName: '', quantity: 1, costPrice: 0, categoryId: undefined, _readOnly: true } as any)}>Add Item</Button>
              </div>
            </div>
            {submitError && <div className="mb-4 text-sm text-red-600">{submitError}</div>}

            <div className="space-y-4">
              {fields.map((f, idx) => renderRow(f, idx))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={() => onOpenChange(false)} variant="destructive">Batal</Button>
              <Button type="submit">Simpan Semua Pembelian</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}