import { z } from "zod";

export const sellPriceSchema = z.object({
  brand: z.string().min(1),
  price: z.number().nonnegative(),
  note: z.string().optional(),
});

export const createSparePartSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  unit: z.string().default("Pcs"),
  stock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  costPrice: z.number().nonnegative().default(0),
  supplierId: z.string().optional().nullable(),
  initialSellPrices: z.array(sellPriceSchema).optional(),
});

export const updateSparePartSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  unit: z.string().optional(),
  // allow numeric values provided as strings (from form inputs) by preprocessing
  stock: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().nonnegative().optional()),
  minStock: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().nonnegative().optional()),
  costPrice: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().nonnegative().optional()),
  supplierId: z.string().optional().nullable(),
  initialSellPrices: z.array(sellPriceSchema).optional(),
  sellPrices: z.array(sellPriceSchema).optional(),
  version: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().positive()),
});


export const createPurchaseSchema = z.object({
  sparePartId: z.string().optional(),
  sparePartCode: z.string().optional(),
  sparePartName: z.string().optional(),
  quantity: z.number().int().positive(),
  costPrice: z.number().nonnegative(),
  supplierId: z.string().optional().nullable(),
  supplierRefNumber: z.string().optional(),
  purchaseDate: z.string().optional(), // ISO date string
  // optional category selection
  categoryId: z.string().optional().nullable(),
  category: z.string().optional(),
}).refine((v) => Boolean(v.sparePartId || v.sparePartCode), { message: 'Either sparePartId or sparePartCode is required', path: ['sparePartCode'] });

// Batch purchase schema: requires purchase header (supplier, date, ref) and at least one item
const createPurchaseItemSchema = z.object({
  sparePartId: z.string().optional(),
  sparePartCode: z.string().optional(),
  sparePartName: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(), // Gross price per unit
  discount: z.number().nonnegative().optional(), // Discount per unit (Amount)
  discountPercent: z.number().nonnegative().optional(), // Discount percentage (UI helper)
  costPrice: z.number().nonnegative(), // Net price (unitPrice - discount)
  // createMasterIfNotFound: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  category: z.string().optional(),
}).refine((v) => Boolean(v.sparePartId || v.sparePartCode), { message: 'Either sparePartId or sparePartCode is required', path: ['sparePartCode'] });


export const createPurchasesSchema = z.object({
  supplierId: z.string().min(1),
  supplierRefNumber: z.string().min(1),
  purchaseDate: z.string().min(1), // ISO date
  items: z.array(createPurchaseItemSchema).min(1),
});
