-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT,
    "sparePartCode" TEXT,
    "sparePartName" TEXT,
    "quantity" INTEGER NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "supplierId" TEXT,
    "supplierRefNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Purchase_sparePartId_idx" ON "Purchase"("sparePartId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
