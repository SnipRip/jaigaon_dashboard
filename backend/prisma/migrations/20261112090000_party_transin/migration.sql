-- TRANSIN: the transporter ID of a vendor without a GSTIN, for e-way bills.
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "transin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Party_transin_key" ON "Party"("transin");


-- CHECK (party-rules.ts checks the same with readable messages): vendors
-- only, never beside a GSTIN, the state code then 13 letters or digits.
ALTER TABLE "Party"
  ADD CONSTRAINT "Party_transin_check" CHECK ("transin" IS NULL OR ("isVendor" AND "gstin" IS NULL AND "transin" ~ '^[0-9]{2}[A-Z0-9]{13}$'));
