-- CreateTable
CREATE TABLE "ItemPrice" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTill" DATE NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2),
    "minSellingPrice" DECIMAL(12,2),
    "costPrice" DECIMAL(12,2),
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemPrice_validFrom_validTill_idx" ON "ItemPrice"("validFrom", "validTill");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPrice_itemId_validFrom_validTill_key" ON "ItemPrice"("itemId", "validFrom", "validTill");

-- AddForeignKey
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rules the API checks too (src/price-list/price-list-rules.ts), kept here so
-- no other path can store a price that breaks them.
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_dates" CHECK ("validTill" >= "validFrom");
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_price" CHECK ("sellingPrice" > 0);
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_minimum" CHECK ("minSellingPrice" IS NULL OR ("minSellingPrice" >= 0 AND "minSellingPrice" <= "sellingPrice"));
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_mrp" CHECK ("mrp" IS NULL OR "sellingPrice" <= "mrp");
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_cost" CHECK ("costPrice" IS NULL OR "costPrice" >= 0);
