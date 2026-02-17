import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";


type CreateSellPrice = { brand: string; price: number; note?: string };

export async function createSparePart(payload: {
  code: string;
  name: string;
  category?: string;
  categoryId?: string | null;
  unit?: string;
  stock?: number;
  minStock?: number;
  costPrice: number;
  supplierId?: string | null;
  initialSellPrices?: CreateSellPrice[];
}) {
  const existing = await prisma.sparePart.findUnique({ where: { code: payload.code } });
  if (existing) throw new Error("Spare part with this code already exists");

  return prisma.$transaction(async (tx) => {
    let categoryName = payload.category ?? null;
    if (payload.categoryId) {
      const cat = await (tx as any).category.findUnique({ where: { id: payload.categoryId } });
      categoryName = cat?.name ?? categoryName;
    }

    const sp = await tx.sparePart.create({
      data: {
        code: payload.code,
        name: payload.name,
        category: categoryName ?? '',
        unit: payload.unit ?? "Pcs",
        stock: payload.stock ?? 0,
        minStock: payload.minStock ?? 0,
        costPrice: new Prisma.Decimal(payload.costPrice),
        supplierId: payload.supplierId ?? undefined,
      },
    });

    // if categoryId provided, attach it in a separate update to avoid type mismatches until Prisma client is regenerated
    if (payload.categoryId) {
      await tx.sparePart.update({ where: { id: sp.id }, data: { categoryId: payload.categoryId } as any });
    }

    if (payload.initialSellPrices && payload.initialSellPrices.length > 0) {
      const items = payload.initialSellPrices.map((p) => ({
        sparePartId: sp.id,
        brand: p.brand,
        price: new Prisma.Decimal(p.price),
        note: p.note,
      }));
      await tx.sellPrice.createMany({ data: items });
    }

    return sp;
  });
}

export async function getSpareParts(opts?: {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  lowStock?: boolean;
  complete?: boolean; // when true, return only items with stock > 0
}) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const where: Prisma.SparePartWhereInput = { isDeleted: false };
  const conditions: Prisma.SparePartWhereInput[] = [];

  if (opts?.category && opts.category !== "all") {
    conditions.push({ category: opts.category });
  }

  if (opts?.q) {
    const terms = opts.q.split(/\s+/).filter(t => t.length > 0);
    terms.forEach(term => {
      conditions.push({
        OR: [
          { code: { contains: term, mode: "insensitive" } },
          { name: { contains: term, mode: "insensitive" } },
        ],
      });
    });
  }

  if (opts?.complete) {
    // Show items that are either in stock OR have transaction history (audits)
    // This hides items that are brand new (stock 0) AND have never been used/purchased.
    conditions.push({
      OR: [
        { stock: { gt: 0 } },
        { audits: { some: {} } }
      ]
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  // Calculate Logical Stock (Physical - Pending Usages)
  // Pending = Items in Visits that are NOT cancelled AND have NOT been invoiced (since invoice creation deducts stock)
  // Note: grouped by sparePartId
  const pendingUsages = await prisma.visitItem.groupBy({
    by: ['sparePartId'],
    _sum: { quantity: true },
    where: {
      visit: {
        status: { not: "BATAL" },
        invoices: { none: { status: { in: ["UNPAID", "PAID"] } } } // Only count if NO active invoice exists. UNPAID invoices already deducted stock.
      }
    }
  });

  const pendingMap = new Map<string, number>();
  pendingUsages.forEach(p => {
    pendingMap.set(p.sparePartId, p._sum?.quantity || 0);
  });

  const [total, items] = await prisma.$transaction([
    prisma.sparePart.count({ where }),
    prisma.sparePart.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        supplier: { select: { id: true, name: true } },
        sellPrices: true
      },
    }),
  ]);

  const filtered = opts?.lowStock ? items.filter((i) => i.stock <= i.minStock) : items;

  // attach supplierName and logicalStock
  const itemsWithSupplier = filtered.map((i) => {
    const pending = pendingMap.get(i.id) || 0;
    return {
      ...i,
      supplierName: i.supplier?.name ?? null,
      logicalStock: i.stock - pending
    };
  });

  return { total, items: itemsWithSupplier };
}

/**
 * List all spare parts with server-side pagination and search.
 * Keeps separation of concerns: service layer handles Prisma queries
 * and returns a stable shape for API routes or callers.
 */
export async function listAllSpareParts(opts?: { page?: number; pageSize?: number; q?: string; category?: string }) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const where: Prisma.SparePartWhereInput = { isDeleted: false };

  if (opts?.category && opts.category !== "all") {
    where.category = opts.category;
  }

  if (opts?.q) {
    const terms = opts.q.split(/\s+/).filter(t => t.length > 0);
    if (terms.length > 0) {
      const searchAnd: Prisma.SparePartWhereInput[] = terms.map(term => ({
        OR: [
          { code: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ]
      }));

      if (Array.isArray(where.AND)) {
        where.AND.push(...searchAnd);
      } else if (where.AND) {
        where.AND = [where.AND, ...searchAnd];
      } else {
        where.AND = searchAnd;
      }
    }
  }

  const [total, items] = await prisma.$transaction([
    prisma.sparePart.count({ where }),
    prisma.sparePart.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
      include: { supplier: { select: { id: true, name: true } } },
    }),
  ]);

  const itemsWithSupplier = items.map((i) => ({ ...i, supplierName: i.supplier?.name ?? null }));
  return { total, items: itemsWithSupplier };
}

export async function getSparePart(id: string) {
  const sp = await prisma.sparePart.findUnique({
    where: { id },
    include: { sellPrices: true },
  });
  if (!sp || sp.isDeleted) return null;
  return sp;
}

export async function updateSparePart(id: string, payload: Partial<{
  code: string; name: string; category: string; categoryId?: string | null; unit: string;
  stock: number; minStock: number; costPrice: number; supplierId?: string | null; version: number;
  sellPrices?: { brand: string; price: number; note?: string }[];
}>) {
  if (!payload.version) throw new Error('Version required for update (optimistic locking)');

  return prisma.$transaction(async (tx) => {
    // if categoryId provided, resolve category name
    let categoryNamePatch: { category?: string } = {};
    if (payload.categoryId) {
      const cat = await (tx as any).category.findUnique({ where: { id: payload.categoryId } });
      if (cat) categoryNamePatch = { category: cat.name };
    } else if (typeof payload.category === 'string') {
      categoryNamePatch = { category: payload.category };
    }

    const updated = await tx.sparePart.updateMany({
      where: { id, version: payload.version, isDeleted: false },
      data: {
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.unit ? { unit: payload.unit } : {}),
        ...categoryNamePatch,
        ...(typeof payload.stock === 'number' ? { stock: payload.stock } : {}),
        ...(typeof payload.minStock === 'number' ? { minStock: payload.minStock } : {}),
        ...(typeof payload.costPrice === 'number' ? { costPrice: new Prisma.Decimal(payload.costPrice) } : {}),
        supplierId: payload.supplierId === undefined ? undefined : payload.supplierId,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) throw new Error('Update conflict or item not found');

    // if categoryId provided, set it separately
    if (payload.categoryId) {
      await tx.sparePart.update({ where: { id }, data: { categoryId: payload.categoryId } as any });
    }

    // Update Sell Prices
    if (payload.sellPrices) {
      await tx.sellPrice.deleteMany({ where: { sparePartId: id } });
      if (payload.sellPrices.length > 0) {
        await tx.sellPrice.createMany({
          data: payload.sellPrices.map((p) => ({
            sparePartId: id,
            brand: p.brand,
            price: new Prisma.Decimal(p.price),
            note: p.note,
          })),
        });
      }
    }

    return tx.sparePart.findUnique({ where: { id }, include: { sellPrices: true } });
  });
}

export async function softDeleteSparePart(id: string, performedBy?: string) {
  // Prevent deleting spare parts that have any purchases associated
  const purchasesCount = await prisma.purchase.count({ where: { sparePartId: id } });
  if (purchasesCount > 0) {
    throw new Error('Cannot delete spare part with existing purchases');
  }

  const sp = await prisma.sparePart.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      entity: 'SparePart',
      entityId: id,
      action: 'DELETE',
      performedBy,
    },
  });
  return sp;
}



export async function getLowStock() {
  return prisma.sparePart.findMany({
    where: { isDeleted: false },
  }).then((rows) => rows.filter((r) => r.stock <= r.minStock));
}

export async function listSellPrices(sparePartId: string) {
  return prisma.sellPrice.findMany({ where: { sparePartId } });
}

export async function createSellPrice(sparePartId: string, payload: CreateSellPrice & { createdBy?: string }) {
  return prisma.sellPrice.create({
    data: {
      sparePartId,
      brand: payload.brand,
      price: new Prisma.Decimal(payload.price),
      note: payload.note,
      createdBy: payload.createdBy,
    },
  });
}

export async function createPurchase(payload: {
  sparePartId?: string | null;
  sparePartCode?: string | null;
  sparePartName?: string | null;
  quantity: number;
  costPrice: number;
  supplierId?: string | null;
  supplierRefNumber?: string | null;
  purchaseDate?: string | null; // ISO
  categoryId?: string | null;
  category?: string | null;
  performedBy?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    let sparePartIdToUse: string | null = null;

    // If explicit sparePartId provided, prefer that
    if (payload.sparePartId) {
      const sp = await tx.sparePart.findUnique({ where: { id: payload.sparePartId } });
      if (!sp) throw new Error('Provided spare part not found');
      sparePartIdToUse = sp.id;
    } else if (payload.sparePartCode) {
      const sp = await tx.sparePart.findUnique({ where: { code: payload.sparePartCode } });
      if (sp) sparePartIdToUse = sp.id;
    }

    // If spare part is still not found, fail - auto-creation of masters is not supported anymore
    if (!sparePartIdToUse) {
      throw new Error('Provided spare part not found');
    }

    // Create purchase record
    const purchase = await tx.purchase.create({
      data: {
        sparePartId: sparePartIdToUse ?? undefined,
        sparePartCode: payload.sparePartCode ?? undefined,
        sparePartName: payload.sparePartName ?? undefined,
        quantity: payload.quantity,
        costPrice: new Prisma.Decimal(payload.costPrice),
        supplierId: payload.supplierId ?? undefined,
        supplierRefNumber: payload.supplierRefNumber ?? undefined,
        purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : undefined,
        createdBy: payload.performedBy ?? undefined,
      },
    });

    // If sparePart was resolved, adjust stock and log audit
    if (sparePartIdToUse) {
      // Atomic Increment
      const updatedSp = await tx.sparePart.update({
        where: { id: sparePartIdToUse },
        data: {
          stock: { increment: payload.quantity },
          ...(typeof payload.costPrice === 'number' ? { costPrice: new Prisma.Decimal(payload.costPrice) } : {}),
          version: { increment: 1 }
        }
      });

      const after = updatedSp.stock;
      const before = after - payload.quantity;

      await tx.inventoryAudit.create({ data: { sparePartId: sparePartIdToUse, delta: payload.quantity, before, after, reason: 'Purchase', referenceId: purchase.id, performedBy: payload.performedBy } });
    }

    return purchase;
  });
}

export async function listPurchases(opts?: { supplierId?: string; sparePartId?: string; page?: number; pageSize?: number; q?: string }) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 100; // default larger for UI lists
  const where: Prisma.PurchaseWhereInput = {};

  if (opts?.supplierId) where.supplierId = opts.supplierId;
  if (opts?.sparePartId) where.sparePartId = opts.sparePartId;
  if (opts?.q) {
    where.OR = [
      { supplierRefNumber: { contains: opts.q, mode: 'insensitive' } },
      { supplier: { name: { contains: opts.q, mode: 'insensitive' } } }
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { purchaseDate: 'desc' },
      include: { sparePart: { select: { id: true, code: true, name: true, category: true } }, supplier: { select: { id: true, name: true } } },
    }),
  ]);

  return { total, items };
}

export async function createPurchases(payload: {
  supplierId: string | null;
  supplierRefNumber?: string | null;
  purchaseDate?: string | null;
  items: Array<{
    sparePartId?: string | null;
    sparePartCode?: string | null;
    sparePartName?: string | null;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    costPrice: number;
    categoryId?: string | null;
    category?: string | null;
    performedBy?: string | null;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const createdPurchases: any[] = [];

    for (const item of payload.items) {
      let sparePartIdToUse: string | null = null;

      if (item.sparePartId) {
        const sp = await tx.sparePart.findUnique({ where: { id: item.sparePartId } });
        if (!sp) throw new Error('Provided spare part not found');
        sparePartIdToUse = sp.id;
      } else if (item.sparePartCode) {
        const sp = await tx.sparePart.findUnique({ where: { code: item.sparePartCode } });
        if (sp) sparePartIdToUse = sp.id;
      }

      if (!sparePartIdToUse) {
        // If not found, try to create if we have code, name and category
        if (item.sparePartCode && item.sparePartName && (item.categoryId || item.category)) {
          // If category ID not provided but name is, we might need to find/create category?
          // For now, assume categoryId is passed if category is selected/created in UI.
          // Or we use item.categoryId.

          let usedCategoryId = item.categoryId;
          let categoryName = item.category;

          if (!categoryName && usedCategoryId) {
            const cat = await tx.category.findUnique({ where: { id: usedCategoryId } });
            categoryName = cat?.name;
          }

          // Fallback if still no name (should not happen if UI is correct, but safe)
          if (!categoryName) categoryName = "Uncategorized";

          // Extra safety: make sure code doesn't exist (race condition check handled by db constraint usually)
          // Create the spare part
          const newPart = await tx.sparePart.create({
            data: {
              code: item.sparePartCode,
              name: item.sparePartName,
              category: categoryName,
              categoryId: usedCategoryId ?? undefined,
              stock: 0,
              minStock: 0,
              costPrice: new Prisma.Decimal(item.costPrice), // Init with purchase cost
            }
          });
          sparePartIdToUse = newPart.id;
        } else {
          throw new Error(`Spare part not found (and insufficient data to create) for item with code=${item.sparePartCode ?? ''}`);
        }
      }

      const purchase = await tx.purchase.create({
        data: {
          sparePartId: sparePartIdToUse ?? undefined,
          sparePartCode: item.sparePartCode ?? undefined,
          sparePartName: item.sparePartName ?? undefined,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice ?? item.costPrice),
          discount: new Prisma.Decimal(item.discount ?? 0),
          costPrice: new Prisma.Decimal(item.costPrice),
          supplierId: payload.supplierId ?? undefined,
          supplierRefNumber: payload.supplierRefNumber ?? undefined,
          purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : undefined,
          createdBy: item.performedBy ?? undefined,
        },
      });

      if (sparePartIdToUse) {
        // Atomic Increment
        const updatedSp = await tx.sparePart.update({
          where: { id: sparePartIdToUse },
          data: {
            stock: { increment: item.quantity },
            ...(typeof item.costPrice === 'number' ? { costPrice: new Prisma.Decimal(item.costPrice) } : {}),
            version: { increment: 1 }
          }
        });

        const after = updatedSp.stock;
        const before = after - item.quantity;

        await tx.inventoryAudit.create({ data: { sparePartId: sparePartIdToUse, delta: item.quantity, before, after, reason: 'Purchase', referenceId: purchase.id, performedBy: item.performedBy } });
      }

      createdPurchases.push(purchase);
    }

    return createdPurchases;
  });
}

export async function getPurchaseGroup(supplierId: string, ref: string) {
  return prisma.purchase.findMany({
    where: { supplierId, supplierRefNumber: ref },
    include: {
      sparePart: { select: { id: true, code: true, name: true, category: true, categoryId: true, costPrice: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' }
  });
}


export async function updatePurchaseGroup(
  original: { supplierId: string; ref: string },
  payload: {
    supplierId: string | null;
    supplierRefNumber?: string | null;
    purchaseDate?: string | null;
    items: Array<{
      sparePartId?: string | null;
      sparePartCode?: string | null;
      sparePartName?: string | null;
      quantity: number;
      unitPrice?: number;
      discount?: number;
      costPrice: number;
      categoryId?: string | null;
      category?: string | null;
      performedBy?: string | null;
    }>;
  }
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find existing purchases to revert
    const existing = await tx.purchase.findMany({
      where: {
        supplierId: original.supplierId,
        supplierRefNumber: original.ref,
      },
      include: { sparePart: true }
    });

    // 2. Revert effects of each existing purchase
    for (const p of existing) {
      if (p.sparePartId) {
        // Atomic Decrement stock
        const updatedSp = await tx.sparePart.update({
          where: { id: p.sparePartId },
          data: {
            stock: { decrement: p.quantity },
            version: { increment: 1 }
          }
        });

        const after = updatedSp.stock;
        const before = after + p.quantity;

        // Log Audit
        await tx.inventoryAudit.create({
          data: {
            sparePartId: p.sparePartId,
            delta: -p.quantity,
            before,
            after,
            reason: 'Purchase Revision (Revert)',
            referenceId: p.id,
            performedBy: payload.items[0]?.performedBy // Use the editor's name if available
          }
        });
      }
      // Delete the purchase record
      await tx.purchase.delete({ where: { id: p.id } });
    }

    // 3. Create new purchases using the existing logic
    const createdPurchases: any[] = [];

    for (const item of payload.items) {
      let sparePartIdToUse: string | null = null;

      if (item.sparePartId) {
        const sp = await tx.sparePart.findUnique({ where: { id: item.sparePartId } });
        if (!sp) throw new Error('Provided spare part not found');
        sparePartIdToUse = sp.id;
      } else if (item.sparePartCode) {
        const sp = await tx.sparePart.findUnique({ where: { code: item.sparePartCode } });
        if (sp) sparePartIdToUse = sp.id;
      }

      if (!sparePartIdToUse) {
        // Create if new (Same logic as createPurchases)
        if (item.sparePartCode && item.sparePartName && (item.categoryId || item.category)) {
          let usedCategoryId = item.categoryId;
          let categoryName = item.category;

          if (!categoryName && usedCategoryId) {
            const cat = await tx.category.findUnique({ where: { id: usedCategoryId } });
            categoryName = cat?.name;
          }
          if (!categoryName) categoryName = "Uncategorized";

          const newPart = await tx.sparePart.create({
            data: {
              code: item.sparePartCode,
              name: item.sparePartName,
              category: categoryName,
              categoryId: usedCategoryId ?? undefined,
              stock: 0,
              minStock: 0,
              costPrice: new Prisma.Decimal(item.costPrice),
            }
          });
          sparePartIdToUse = newPart.id;
        } else {
          throw new Error(`Spare part not found for item code=${item.sparePartCode ?? ''}`);
        }
      }

      const purchase = await tx.purchase.create({
        data: {
          sparePartId: sparePartIdToUse ?? undefined,
          sparePartCode: item.sparePartCode ?? undefined,
          sparePartName: item.sparePartName ?? undefined,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice ?? item.costPrice),
          discount: new Prisma.Decimal(item.discount ?? 0),
          costPrice: new Prisma.Decimal(item.costPrice),
          supplierId: payload.supplierId ?? undefined,
          supplierRefNumber: payload.supplierRefNumber ?? undefined,
          purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : undefined,
          createdBy: item.performedBy ?? undefined,
        },
      });

      if (sparePartIdToUse) {
        // Atomic Increment
        const updatedSp = await tx.sparePart.update({
          where: { id: sparePartIdToUse },
          data: {
            stock: { increment: item.quantity },
            // We update cost price to the new one (Weighted Average is better but for now Last Price as per original logic)
            ...(typeof item.costPrice === 'number' ? { costPrice: new Prisma.Decimal(item.costPrice) } : {}),
            version: { increment: 1 }
          }
        });

        const after = updatedSp.stock;
        const before = after - item.quantity; // Reverse calculate before state

        await tx.inventoryAudit.create({
          data: {
            sparePartId: sparePartIdToUse,
            delta: item.quantity,
            before,
            after,
            reason: 'Purchase Revision (Update)',
            referenceId: purchase.id,
            performedBy: item.performedBy
          }
        });
      }

      createdPurchases.push(purchase);
    }

    return createdPurchases;
  });
}
