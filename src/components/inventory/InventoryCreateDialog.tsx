"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSparePartSchema } from "@/lib/inventory/schemas";
import { z } from "zod";
import Combobox from "@/components/ui/combobox";
import { toast } from "sonner";

type FormType = z.infer<typeof createSparePartSchema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (item: any) => void;
};

const defaults: FormType = {
  code: "",
  name: "",
  category: "",
  unit: "Pcs",
  categoryId: undefined,
  supplierId: undefined,
  stock: 0,
  minStock: 0,
  costPrice: 0,
  initialSellPrices: undefined,
};

export default function InventoryCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [units, setUnits] = useState<string[]>([]);

  // inline add category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);

  // inline add unit
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [addingUnitLoading, setAddingUnitLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(createSparePartSchema as any),
    defaultValues: defaults,
  });

  /* ================= RESET ON CLOSE ================= */
  useEffect(() => {
    if (!open) {
      reset(defaults);
    }
  }, [open, reset]);

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    if (!open) return;

    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data || []);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();

    // Fetch Units
    fetch("/api/units")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // New structure is { name, id, usage, isStored }
          // Old was string[]
          // We need string[] here for now
          const names = data.map(d => typeof d === 'string' ? d : d.name);
          // Deduplicate just in case
          const unique = Array.from(new Set(names)) as string[];
          setUnits(unique);
        }
      })
      .catch(() => { });

  }, [open]);

  /* ================= SUBMIT ================= */
  async function onSubmit(values: FormType) {
    if (!values.category && !values.categoryId) {
      setError("categoryId", { message: "Kategori wajib dipilih" });
      handleInvalid();
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: values.code,
        name: values.name,
        category: values.category || undefined,
        categoryId: values.categoryId || undefined,
        supplierId: values.supplierId || undefined,
        minStock: values.minStock ?? 0,
        initialSellPrices: values.initialSellPrices || undefined,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Gagal membuat spare part");
        return;
      }

      const item = await res.json();
      toast.success("Spare part berhasil dibuat");
      onCreated?.(item);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat spare part");
    } finally {
      setLoading(false);
    }
  }

  /* ================= INVALID HANDLER ================= */
  function handleInvalid(errors?: FieldErrors<FormType>) {
    console.log("Form Invalid", errors);
    // fokuskan ke category jika error
    setTimeout(() => {
      const el = document.querySelector(
        'input[placeholder="-- Pilih Kategori --"]'
      ) as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Spare Part</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any, handleInvalid)} className="space-y-3">
          {/* CODE */}
          <div>
            <label className="text-sm">Kode</label>
            <Input {...register("code")} />
            {errors.code && (
              <div className="text-sm text-red-500">{errors.code.message}</div>
            )}
          </div>

          {/* NAME */}
          <div>
            <label className="text-sm">Nama</label>
            <Input {...register("name")} />
            {errors.name && (
              <div className="text-sm text-red-500">{errors.name.message}</div>
            )}
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-sm">Kategori</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={categories}
                  value={watch("categoryId") || ""}
                  onChange={(id) => setValue("categoryId", id)}
                  placeholder="Pilih Kategori"
                  isLoading={categoriesLoading}
                />
                {errors.categoryId && (
                  <div className="text-sm text-red-500 mt-1">
                    {errors.categoryId.message}
                  </div>
                )}
              </div>

              {!addingCategory ? (
                <button
                  type="button"
                  className="text-xs text-blue-600 underline"
                  onClick={() => setAddingCategory(true)}
                >
                  Tambah
                </button>
              ) : (
                <div className="flex gap-1 items-center">
                  <input
                    className="p-1 border rounded text-sm"
                    placeholder="Nama kategori"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                    disabled={addingCategoryLoading}
                    onClick={async () => {
                      if (!newCategoryName) return;
                      setAddingCategoryLoading(true);
                      try {
                        const res = await fetch("/api/categories", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newCategoryName }),
                        });
                        if (!res.ok) throw new Error();
                        const created = await res.json();
                        setCategories((s) => [created, ...s]);
                        setValue("categoryId", created.id);
                        setNewCategoryName("");
                        setAddingCategory(false);
                        toast.success("Kategori ditambahkan");
                      } catch {
                        toast.error("Gagal menambahkan kategori");
                      } finally {
                        setAddingCategoryLoading(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-600"
                    onClick={() => {
                      setAddingCategory(false);
                      setNewCategoryName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* UNIT - Dynamic Switch */}
          <div>
            <label className="text-sm">Satuan</label>
            <div className="flex gap-2">
              <div className="flex-1">
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

              {!addingUnit ? (
                <button
                  type="button"
                  className="text-xs text-blue-600 underline"
                  onClick={() => setAddingUnit(true)}
                >
                  Tambah
                </button>
              ) : (
                <div className="flex gap-1 items-center">
                  <input
                    className="p-1 border rounded text-sm w-24"
                    placeholder="Satuan..."
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                    disabled={addingUnitLoading}
                    onClick={async () => {
                      if (!newUnitName) return;

                      // Check if already exists (case-insensitive)
                      const existing = units.find(u => u.toLowerCase() === newUnitName.trim().toLowerCase());
                      if (existing) {
                        setValue("unit", existing);
                        setNewUnitName("");
                        setAddingUnit(false);
                        toast.info(`Satuan '${existing}' sudah ada, menggunakan data yang tersedia.`);
                        return;
                      }

                      setAddingUnitLoading(true);
                      try {
                        const res = await fetch("/api/units", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newUnitName }),
                        });
                        if (!res.ok) throw new Error();
                        const created = await res.json();

                        setUnits((s) => {
                          // Prevent duplicate add
                          if (s.some(u => u.toLowerCase() === created.name.toLowerCase())) {
                            return s;
                          }
                          return [...s, created.name].sort();
                        });

                        setValue("unit", created.name);
                        setNewUnitName("");
                        setAddingUnit(false);
                        toast.success("Satuan ditambahkan");
                      } catch {
                        toast.error("Gagal menambahkan satuan");
                      } finally {
                        setAddingUnitLoading(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-600"
                    onClick={() => {
                      setAddingUnit(false);
                      setNewUnitName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {errors.unit && (
              <div className="text-sm text-red-500">{errors.unit.message}</div>
            )}
          </div>

          {/* MIN STOCK */}
          <div>
            <label className="text-sm">Min. Stock</label>
            <Input type="number" {...register("minStock", { valueAsNumber: true })} />
            {errors.minStock && (
              <div className="text-sm text-red-500">{errors.minStock.message}</div>
            )}
          </div>

          <Button className="w-full text-white bg-sky-900 hover:bg-sky-700 justify-center" type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Buat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
