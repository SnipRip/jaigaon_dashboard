-- Refunds of advances: a refund is a settlement in the other direction (a
-- payment to a customer, a receipt from a vendor) whose allocations point at
-- the receipt or payment whose advance it gives back (Tally: a Payment or
-- Receipt voucher "Agst Ref" the advance).

-- AlterTable
ALTER TABLE "SettlementAllocation" ADD COLUMN     "advanceId" UUID;

-- CreateIndex
CREATE INDEX "SettlementAllocation_advanceId_idx" ON "SettlementAllocation"("advanceId");

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Settlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Exactly one target, the advance now among them; a settlement never refunds itself.
ALTER TABLE "SettlementAllocation" DROP CONSTRAINT "SettlementAllocation_target_check";
ALTER TABLE "SettlementAllocation"
  ADD CONSTRAINT "SettlementAllocation_target_check" CHECK (num_nonnulls("invoiceId", "billId", "openingPartyId", "expenseId", "advanceId") = 1),
  ADD CONSTRAINT "SettlementAllocation_advance_check" CHECK ("advanceId" IS NULL OR "advanceId" <> "settlementId");
