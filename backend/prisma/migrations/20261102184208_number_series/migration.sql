-- CreateEnum
CREATE TYPE "SeriesDocument" AS ENUM ('QUOTATION', 'SALES_INVOICE', 'EXPORT_INVOICE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'STOCK_JOURNAL', 'SHIPMENT', 'EXPENSE');

-- CreateTable
CREATE TABLE "NumberSeries" (
    "id" UUID NOT NULL,
    "document" "SeriesDocument" NOT NULL,
    "financialYear" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "lastIssued" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NumberSeries_document_financialYear_key" ON "NumberSeries"("document", "financialYear");

-- The service checks these too (number-series-rules.ts); the database keeps
-- them true. A GST invoice number is at most 16 characters (CGST rule 46),
-- so prefix plus padded digits must fit.
ALTER TABLE "NumberSeries" ADD CONSTRAINT "NumberSeries_financialYear" CHECK (
  "financialYear" ~ '^[0-9]{4}-[0-9]{2}$'
  AND substring("financialYear" from 6 for 2)::int = (substring("financialYear" from 1 for 4)::int + 1) % 100
);
ALTER TABLE "NumberSeries" ADD CONSTRAINT "NumberSeries_prefix" CHECK ("prefix" ~ '^[A-Z0-9/-]{1,12}$');
ALTER TABLE "NumberSeries" ADD CONSTRAINT "NumberSeries_padding" CHECK ("padding" BETWEEN 1 AND 8);
ALTER TABLE "NumberSeries" ADD CONSTRAINT "NumberSeries_length" CHECK (length("prefix") + "padding" <= 16);
ALTER TABLE "NumberSeries" ADD CONSTRAINT "NumberSeries_numbers" CHECK ("lastIssued" >= 0 AND "nextNumber" > "lastIssued");
