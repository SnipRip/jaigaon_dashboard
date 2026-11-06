-- Expenses (SOW 13): paid from bank / cash or owed to a vendor, under an
-- expense head, with GST from the head and the vendor, and an allocation to
-- a goods bill's items, an invoice, a shipment (linked later) or overhead.
-- Vendor payments may settle an expense bought on credit. The service checks
-- everything under row locks; the CHECKs keep the basics true whatever writes.
-- AlterTable
ALTER TABLE "SettlementAllocation" ADD COLUMN     "expenseId" UUID;

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "headId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "vendorId" UUID,
    "payee" TEXT,
    "accountId" UUID,
    "mode" "PaymentMode",
    "dueDate" DATE,
    "taxSplit" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "gstRatePct" DECIMAL(5,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL,
    "sgst" DECIMAL(14,2) NOT NULL,
    "igst" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "itcEligible" BOOLEAN NOT NULL DEFAULT true,
    "total" DECIMAL(14,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "allocation" "HeadAllocation" NOT NULL,
    "billId" UUID,
    "invoiceId" UUID,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_issuedNumberId_key" ON "Expense"("issuedNumberId");

-- CreateIndex
CREATE INDEX "Expense_number_idx" ON "Expense"("number");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_vendorId_date_idx" ON "Expense"("vendorId", "date");

-- CreateIndex
CREATE INDEX "Expense_accountId_date_idx" ON "Expense"("accountId", "date");

-- CreateIndex
CREATE INDEX "Expense_billId_idx" ON "Expense"("billId");

-- CreateIndex
CREATE INDEX "Expense_invoiceId_idx" ON "Expense"("invoiceId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_expenseId_idx" ON "SettlementAllocation"("expenseId");

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_headId_fkey" FOREIGN KEY ("headId") REFERENCES "AccountHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CHECKs
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_payee_check" CHECK (num_nonnulls("vendorId", "payee") = 1),
  -- Paid through an account with its mode, or owed to a vendor with a due date.
  ADD CONSTRAINT "Expense_paid_check" CHECK (
    ("accountId" IS NOT NULL AND "mode" IS NOT NULL AND "dueDate" IS NULL)
    OR ("accountId" IS NULL AND "mode" IS NULL AND "vendorId" IS NOT NULL AND "dueDate" IS NOT NULL)),
  ADD CONSTRAINT "Expense_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Expense_rate_check" CHECK ("gstRatePct" IN (0, 5, 12, 18, 28, 40)),
  ADD CONSTRAINT "Expense_split_check" CHECK (
    ("taxSplit" = 'NONE' AND "tax" = 0 AND "gstRatePct" = 0)
    OR ("taxSplit" = 'INTRA' AND "igst" = 0)
    OR ("taxSplit" = 'INTER' AND "cgst" = 0 AND "sgst" = 0)),
  ADD CONSTRAINT "Expense_tax_check" CHECK ("cgst" >= 0 AND "sgst" >= 0 AND "igst" >= 0 AND "tax" = "cgst" + "sgst" + "igst"),
  ADD CONSTRAINT "Expense_total_check" CHECK ("total" = "amount" + "tax"),
  ADD CONSTRAINT "Expense_cost_check" CHECK ("cost" = CASE WHEN "itcEligible" THEN "amount" ELSE "amount" + "tax" END),
  -- A goods bill only for item cost, an invoice only for an invoice; a shipment is linked once shipments are stored.
  ADD CONSTRAINT "Expense_allocation_check" CHECK (
    ("allocation" = 'ITEM_COST' AND "billId" IS NOT NULL AND "invoiceId" IS NULL)
    OR ("allocation" = 'INVOICE' AND "invoiceId" IS NOT NULL AND "billId" IS NULL)
    OR ("allocation" IN ('SHIPMENT', 'OVERHEAD') AND "billId" IS NULL AND "invoiceId" IS NULL)),
  ADD CONSTRAINT "Expense_cancel_check" CHECK (("cancelledAt" IS NULL) = ("cancelReason" IS NULL));

-- A settlement allocation now has one of four targets.
ALTER TABLE "SettlementAllocation" DROP CONSTRAINT "SettlementAllocation_target_check";
ALTER TABLE "SettlementAllocation"
  ADD CONSTRAINT "SettlementAllocation_target_check" CHECK (num_nonnulls("invoiceId", "billId", "openingPartyId", "expenseId") = 1);
