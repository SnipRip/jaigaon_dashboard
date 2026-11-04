/*
  Warnings:

  - You are about to drop the column `minSellingPrice` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `priceLevelId` on the `Party` table. All the data in the column will be lost.
  - You are about to drop the `PriceLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PriceLevelDiscount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuantitySlab` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Party" DROP CONSTRAINT "Party_priceLevelId_fkey";

-- DropForeignKey
ALTER TABLE "PriceLevelDiscount" DROP CONSTRAINT "PriceLevelDiscount_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "PriceLevelDiscount" DROP CONSTRAINT "PriceLevelDiscount_priceLevelId_fkey";

-- DropForeignKey
ALTER TABLE "QuantitySlab" DROP CONSTRAINT "QuantitySlab_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "QuantitySlab" DROP CONSTRAINT "QuantitySlab_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "minSellingPrice",
DROP COLUMN "sellingPrice";

-- AlterTable
ALTER TABLE "Party" DROP COLUMN "priceLevelId";

-- DropTable
DROP TABLE "PriceLevel";

-- DropTable
DROP TABLE "PriceLevelDiscount";

-- DropTable
DROP TABLE "QuantitySlab";
