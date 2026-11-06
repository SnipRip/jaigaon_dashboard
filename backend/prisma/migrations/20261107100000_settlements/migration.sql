-- Receipts from customers and payments to vendors, each applied to invoices,
-- bills or the party's opening balance (src/settlements). The service checks
-- balances under row locks; the CHECKs keep the basics true whatever writes.
-- CreateEnum
CREATE TYPE "SettlementDirection" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH');

-- CreateTable
CREATE TABLE "Settlement" (
    "id" UUID NOT NULL,
    "direction" "SettlementDirection" NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "partyId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "tds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "brcNumber" TEXT,
    "brcDate" DATE,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementAllocation" (
    "id" UUID NOT NULL,
    "settlementId" UUID NOT NULL,
    "invoiceId" UUID,
    "billId" UUID,
    "openingPartyId" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_issuedNumberId_key" ON "Settlement"("issuedNumberId");

-- CreateIndex
CREATE INDEX "Settlement_partyId_date_idx" ON "Settlement"("partyId", "date");

-- CreateIndex
CREATE INDEX "Settlement_direction_date_idx" ON "Settlement"("direction", "date");

-- CreateIndex
CREATE INDEX "Settlement_accountId_date_idx" ON "Settlement"("accountId", "date");

-- CreateIndex
CREATE INDEX "SettlementAllocation_settlementId_idx" ON "SettlementAllocation"("settlementId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_invoiceId_idx" ON "SettlementAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_billId_idx" ON "SettlementAllocation"("billId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_openingPartyId_idx" ON "SettlementAllocation"("openingPartyId");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_openingPartyId_fkey" FOREIGN KEY ("openingPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_amount_check" CHECK ("amount" >= 0 AND "tds" >= 0 AND "amount" + "tds" > 0),
  ADD CONSTRAINT "Settlement_brc_check" CHECK (("brcNumber" IS NULL) = ("brcDate" IS NULL)),
  ADD CONSTRAINT "Settlement_brc_receipt_check" CHECK ("brcNumber" IS NULL OR "direction" = 'RECEIPT'),
  ADD CONSTRAINT "Settlement_cancel_check" CHECK (("cancelledAt" IS NULL) = ("cancelReason" IS NULL));

-- Exactly one target per allocation, and a positive amount.
ALTER TABLE "SettlementAllocation"
  ADD CONSTRAINT "SettlementAllocation_target_check" CHECK (num_nonnulls("invoiceId", "billId", "openingPartyId") = 1),
  ADD CONSTRAINT "SettlementAllocation_amount_check" CHECK ("amount" > 0);
