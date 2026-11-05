-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('LOCAL', 'EXPORT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'CONVERTED';

-- AlterTable
ALTER TABLE "ItemOpeningStock" ADD COLUMN     "drawn" DECIMAL(14,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "partyId" UUID NOT NULL,
    "godownId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "regime" "SaleRegime" NOT NULL,
    "placeOfSupply" TEXT,
    "lutArn" TEXT,
    "destinationCountry" TEXT,
    "currency" "PartyCurrency" NOT NULL DEFAULT 'INR',
    "shipToLine" TEXT,
    "shipToCity" TEXT,
    "vehicleNumber" TEXT,
    "notes" TEXT,
    "quotationId" UUID,
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
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
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
    "costOfGoods" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceStockDraw" (
    "id" UUID NOT NULL,
    "invoiceLineId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "InvoiceStockDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_issuedNumberId_key" ON "Invoice"("issuedNumberId");

-- CreateIndex
CREATE INDEX "Invoice_number_idx" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_partyId_date_idx" ON "Invoice"("partyId", "date");

-- CreateIndex
CREATE INDEX "Invoice_date_idx" ON "Invoice"("date");

-- CreateIndex
CREATE INDEX "Invoice_quotationId_idx" ON "Invoice"("quotationId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_partyId_itemId_date_idx" ON "InvoiceLine"("partyId", "itemId", "date" DESC);

-- CreateIndex
CREATE INDEX "InvoiceStockDraw_invoiceLineId_idx" ON "InvoiceStockDraw"("invoiceLineId");

-- CreateIndex
CREATE INDEX "InvoiceStockDraw_batchId_idx" ON "InvoiceStockDraw"("batchId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_itemPriceId_fkey" FOREIGN KEY ("itemPriceId") REFERENCES "ItemPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_specialRateId_fkey" FOREIGN KEY ("specialRateId") REFERENCES "SpecialRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceStockDraw" ADD CONSTRAINT "InvoiceStockDraw_invoiceLineId_fkey" FOREIGN KEY ("invoiceLineId") REFERENCES "InvoiceLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceStockDraw" ADD CONSTRAINT "InvoiceStockDraw_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The same rules src/invoices/invoices.service.ts and src/stock/stock-out.ts
-- check before a save.
ALTER TABLE "ItemOpeningStock" ADD CONSTRAINT "ItemOpeningStock_drawn_check" CHECK ("drawn" >= 0 AND "drawn" <= "quantity");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_check"
  CHECK ("gross" >= 0 AND "schemeDiscount" >= 0 AND "taxable" >= 0 AND "tax" >= 0 AND "total" >= 0 AND "cost" >= 0);
-- A local invoice names its place of supply; an export under LUT quotes the LUT.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_kind_check"
  CHECK (("kind" = 'LOCAL' AND "placeOfSupply" IS NOT NULL) OR ("kind" = 'EXPORT' AND "regime" IN ('EXPORT_LUT', 'EXPORT_IGST')));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_lut_check" CHECK ("regime" <> 'EXPORT_LUT' OR "lutArn" IS NOT NULL);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_cancel_check" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL));
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_values_check"
  CHECK ("quantity" > 0 AND "rate" >= 0 AND "discountPct" >= 0 AND "discountPct" < 100 AND "schemeDiscount" >= 0
    AND "freeQuantity" >= 0 AND "gstRatePct" >= 0 AND "taxable" >= 0 AND "costOfGoods" >= 0);
ALTER TABLE "InvoiceStockDraw" ADD CONSTRAINT "InvoiceStockDraw_values_check" CHECK ("quantity" > 0 AND "rate" >= 0);
