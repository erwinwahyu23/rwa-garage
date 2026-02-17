/*
  Warnings:

  - You are about to drop the column `diagnoses` on the `Visit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Visit" DROP COLUMN "diagnoses",
ADD COLUMN     "diagnosis" TEXT;
