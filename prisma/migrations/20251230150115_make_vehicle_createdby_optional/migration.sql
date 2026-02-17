-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_createdById_fkey";

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "year" DROP NOT NULL,
ALTER COLUMN "ownerName" DROP NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL,
ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
