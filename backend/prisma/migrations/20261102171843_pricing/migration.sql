-- CreateEnum
CREATE TYPE "SpecialRateKind" AS ENUM ('NET', 'DISCOUNT');

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "priceLevelId" UUID;

-- CreateTable
CREATE TABLE "PriceLevel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceLevelDiscount" (
    "id" UUID NOT NULL,
    "priceLevelId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "PriceLevelDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialRate" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "itemId" UUID,
    "categoryId" UUID,
    "kind" "SpecialRateKind" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTill" DATE,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantitySlab" (
    "id" UUID NOT NULL,
    "itemId" UUID,
    "categoryId" UUID,
    "minQuantity" DECIMAL(14,3) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuantitySlab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceLevel_name_key" ON "PriceLevel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PriceLevelDiscount_priceLevelId_categoryId_key" ON "PriceLevelDiscount"("priceLevelId", "categoryId");

-- CreateIndex
CREATE INDEX "SpecialRate_partyId_idx" ON "SpecialRate"("partyId");

-- CreateIndex
CREATE INDEX "QuantitySlab_itemId_idx" ON "QuantitySlab"("itemId");

-- CreateIndex
CREATE INDEX "QuantitySlab_categoryId_idx" ON "QuantitySlab"("categoryId");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_priceLevelId_fkey" FOREIGN KEY ("priceLevelId") REFERENCES "PriceLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceLevelDiscount" ADD CONSTRAINT "PriceLevelDiscount_priceLevelId_fkey" FOREIGN KEY ("priceLevelId") REFERENCES "PriceLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceLevelDiscount" ADD CONSTRAINT "PriceLevelDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRate" ADD CONSTRAINT "SpecialRate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRate" ADD CONSTRAINT "SpecialRate_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRate" ADD CONSTRAINT "SpecialRate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitySlab" ADD CONSTRAINT "QuantitySlab_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitySlab" ADD CONSTRAINT "QuantitySlab_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: Prisma cannot express these. A special rate or slab is for
-- one item or one category, never both or neither; a rate never ends before
-- it starts.
ALTER TABLE "SpecialRate" ADD CONSTRAINT "SpecialRate_one_target" CHECK (num_nonnulls("itemId", "categoryId") = 1);
ALTER TABLE "SpecialRate" ADD CONSTRAINT "SpecialRate_dates" CHECK ("validTill" IS NULL OR "validTill" >= "validFrom");
ALTER TABLE "QuantitySlab" ADD CONSTRAINT "QuantitySlab_one_target" CHECK (num_nonnulls("itemId", "categoryId") = 1);
