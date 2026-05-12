/*
  Warnings:

  - You are about to drop the `_DiscountToProduct` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[productId]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_DiscountToProduct" DROP CONSTRAINT "_DiscountToProduct_A_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountToProduct" DROP CONSTRAINT "_DiscountToProduct_B_fkey";

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "value" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- DropTable
DROP TABLE "_DiscountToProduct";

-- CreateIndex
CREATE UNIQUE INDEX "Discount_productId_key" ON "Discount"("productId");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
