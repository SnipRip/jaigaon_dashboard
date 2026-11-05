-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LineRateSource" AS ENUM ('SPECIAL', 'SHEET', 'LAST_QUOTED', 'LAST_SOLD', 'MANUAL');

-- CreateEnum
CREATE TYPE "SaleRegime" AS ENUM ('INTRA_STATE', 'INTER_STATE', 'EXPORT_LUT', 'EXPORT_IGST');

-- CreateTable
CREATE TABLE "Quotation" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "partyId" UUID NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'SENT',
    "regime" "SaleRegime" NOT NULL,
    "terms" TEXT,
    "notes" TEXT,
    "gross" DECIMAL(14,2) NOT NULL,
    "schemeDiscount" DECIMAL(14,2) NOT NULL,
    "taxable" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL,
    "sgst" DECIMAL(14,2) NOT NULL,
    "igst" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "roundOff" DECIMAL(6,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "partyId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "itemId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "hsn" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rateSource" "LineRateSource" NOT NULL,
    "suggestedRate" DECIMAL(12,2),
    "itemPriceId" UUID,
    "specialRateId" UUID,
    "schemeDiscount" DECIMAL(14,2) NOT NULL,
    "freeQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "schemes" JSONB NOT NULL DEFAULT '[]',
    "gstRatePct" DECIMAL(5,2) NOT NULL,
    "taxable" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "costAtQuote" DECIMAL(14,4),

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationRevision" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");

-- CreateIndex
CREATE INDEX "Quotation_partyId_date_idx" ON "Quotation"("partyId", "date");

-- CreateIndex
CREATE INDEX "Quotation_date_idx" ON "Quotation"("date");

-- CreateIndex
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationLine_partyId_itemId_date_idx" ON "QuotationLine"("partyId", "itemId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "QuotationRevision_quotationId_revision_key" ON "QuotationRevision"("quotationId", "revision");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_itemPriceId_fkey" FOREIGN KEY ("itemPriceId") REFERENCES "ItemPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_specialRateId_fkey" FOREIGN KEY ("specialRateId") REFERENCES "SpecialRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRevision" ADD CONSTRAINT "QuotationRevision_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The same rules src/quotations/quotation-rules.ts checks before a save.
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_dates_check" CHECK ("validUntil" >= "date");
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_amounts_check"
  CHECK ("gross" >= 0 AND "schemeDiscount" >= 0 AND "taxable" >= 0 AND "tax" >= 0 AND "total" >= 0 AND "revision" >= 0);
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_values_check"
  CHECK ("quantity" > 0 AND "rate" >= 0 AND "discountPct" >= 0 AND "discountPct" < 100 AND "schemeDiscount" >= 0
    AND "freeQuantity" >= 0 AND "gstRatePct" >= 0 AND "taxable" >= 0);
