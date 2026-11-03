-- Replaces the first number series table (migration 20261102184208): one
-- prefix and next number per document and year could not hold the formats
-- the client needs. It never held real numbers, so it is dropped.
DROP TABLE "NumberSeries";
DROP TYPE "SeriesDocument";

-- CreateEnum
CREATE TYPE "NumberedKind" AS ENUM ('QUOTATION', 'SALES_INVOICE', 'EXPORT_INVOICE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'STOCK_JOURNAL', 'SHIPMENT', 'EXPENSE', 'CUSTOMER_CODE', 'VENDOR_CODE', 'ITEM_SKU');

-- CreateEnum
CREATE TYPE "NumberingMethod" AS ENUM ('AUTOMATIC', 'AUTOMATIC_MANUAL_OVERRIDE', 'MANUAL');

-- CreateEnum
CREATE TYPE "NumberReset" AS ENUM ('YEARLY', 'MONTHLY', 'NEVER');

-- CreateEnum
CREATE TYPE "IssuedNumberStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "NumberSeries" (
    "id" UUID NOT NULL,
    "kind" "NumberedKind" NOT NULL,
    "method" "NumberingMethod" NOT NULL DEFAULT 'AUTOMATIC',
    "tallyVoucherType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberFormat" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "applicableFrom" DATE NOT NULL,
    "pattern" TEXT NOT NULL,
    "startNumber" INTEGER NOT NULL DEFAULT 1,
    "reset" "NumberReset" NOT NULL DEFAULT 'YEARLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumberFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberCounter" (
    "formatId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL,

    CONSTRAINT "NumberCounter_pkey" PRIMARY KEY ("formatId","period")
);

-- CreateTable
CREATE TABLE "IssuedNumber" (
    "id" UUID NOT NULL,
    "kind" "NumberedKind" NOT NULL,
    "scope" TEXT NOT NULL,
    "uniqueWithin" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "formatId" UUID,
    "sequence" INTEGER,
    "documentDate" DATE NOT NULL,
    "documentId" UUID,
    "status" "IssuedNumberStatus" NOT NULL DEFAULT 'ISSUED',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NumberSeries_kind_key" ON "NumberSeries"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "NumberFormat_seriesId_applicableFrom_key" ON "NumberFormat"("seriesId", "applicableFrom");

-- CreateIndex
CREATE INDEX "IssuedNumber_kind_uniqueWithin_idx" ON "IssuedNumber"("kind", "uniqueWithin");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedNumber_scope_uniqueWithin_number_key" ON "IssuedNumber"("scope", "uniqueWithin", "number");

-- AddForeignKey
ALTER TABLE "NumberFormat" ADD CONSTRAINT "NumberFormat_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "NumberSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberCounter" ADD CONSTRAINT "NumberCounter_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "NumberFormat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedNumber" ADD CONSTRAINT "IssuedNumber_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "NumberFormat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The service checks these too (number-pattern.ts); the database keeps them
-- true.
ALTER TABLE "NumberFormat" ADD CONSTRAINT "NumberFormat_pattern" CHECK (length("pattern") BETWEEN 1 AND 60);
ALTER TABLE "NumberFormat" ADD CONSTRAINT "NumberFormat_startNumber" CHECK ("startNumber" BETWEEN 1 AND 99999999);
ALTER TABLE "NumberCounter" ADD CONSTRAINT "NumberCounter_nextNumber" CHECK ("nextNumber" >= 1);
-- Letters (upper case), digits, "-" and "/": the GST rule 46 character set,
-- also safe in Tally. Length per kind is checked in the service.
ALTER TABLE "IssuedNumber" ADD CONSTRAINT "IssuedNumber_number" CHECK ("number" ~ '^[A-Z0-9/-]{1,30}$');
ALTER TABLE "IssuedNumber" ADD CONSTRAINT "IssuedNumber_sequence" CHECK ("sequence" IS NULL OR "sequence" >= 1);
ALTER TABLE "IssuedNumber" ADD CONSTRAINT "IssuedNumber_cancelled" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL));

-- One series per kind, with no format yet: the client sets each one up.
-- Master codes default to manual override, so an existing code can be typed.
INSERT INTO "NumberSeries" ("id", "kind", "method", "tallyVoucherType", "updatedAt") VALUES
  (gen_random_uuid(), 'QUOTATION', 'AUTOMATIC', NULL, now()),
  (gen_random_uuid(), 'SALES_INVOICE', 'AUTOMATIC', 'Sales', now()),
  (gen_random_uuid(), 'EXPORT_INVOICE', 'AUTOMATIC', 'Sales', now()),
  (gen_random_uuid(), 'PURCHASE', 'AUTOMATIC', 'Purchase', now()),
  (gen_random_uuid(), 'RECEIPT', 'AUTOMATIC', 'Receipt', now()),
  (gen_random_uuid(), 'PAYMENT', 'AUTOMATIC', 'Payment', now()),
  (gen_random_uuid(), 'CREDIT_NOTE', 'AUTOMATIC', 'Credit Note', now()),
  (gen_random_uuid(), 'DEBIT_NOTE', 'AUTOMATIC', 'Debit Note', now()),
  (gen_random_uuid(), 'STOCK_JOURNAL', 'AUTOMATIC', 'Stock Journal', now()),
  (gen_random_uuid(), 'SHIPMENT', 'AUTOMATIC', NULL, now()),
  (gen_random_uuid(), 'EXPENSE', 'AUTOMATIC', NULL, now()),
  (gen_random_uuid(), 'CUSTOMER_CODE', 'AUTOMATIC_MANUAL_OVERRIDE', NULL, now()),
  (gen_random_uuid(), 'VENDOR_CODE', 'AUTOMATIC_MANUAL_OVERRIDE', NULL, now()),
  (gen_random_uuid(), 'ITEM_SKU', 'AUTOMATIC_MANUAL_OVERRIDE', NULL, now());
