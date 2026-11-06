-- CreateEnum
CREATE TYPE "StockMoveStatus" AS ENUM ('POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('DAMAGED', 'LOST', 'CONSUMED', 'COUNT_SHORT', 'COUNT_EXCESS', 'FOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "StockAdjustmentDirection" AS ENUM ('IN', 'OUT');

-- AlterEnum
ALTER TYPE "NumberedKind" ADD VALUE 'STOCK_TRANSFER';

-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "adjustmentLineId" UUID,
ADD COLUMN     "sourceBatchId" UUID,
ADD COLUMN     "transferLineId" UUID,
ALTER COLUMN "billLineId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "fromGodownId" UUID NOT NULL,
    "toGodownId" UUID NOT NULL,
    "status" "StockMoveStatus" NOT NULL DEFAULT 'POSTED',
    "value" DECIMAL(14,2) NOT NULL,
    "vehicleNumber" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferLine" (
    "id" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "StockTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "godownId" UUID NOT NULL,
    "direction" "StockAdjustmentDirection" NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "status" "StockMoveStatus" NOT NULL DEFAULT 'POSTED',
    "value" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustmentLine" (
    "id" UUID NOT NULL,
    "adjustmentId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(14,4),
    "value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "StockAdjustmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMoveDraw" (
    "id" UUID NOT NULL,
    "transferLineId" UUID,
    "adjustmentLineId" UUID,
    "batchId" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "StockMoveDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_issuedNumberId_key" ON "StockTransfer"("issuedNumberId");

-- CreateIndex
CREATE INDEX "StockTransfer_number_idx" ON "StockTransfer"("number");

-- CreateIndex
CREATE INDEX "StockTransfer_date_idx" ON "StockTransfer"("date");

-- CreateIndex
CREATE INDEX "StockTransferLine_transferId_idx" ON "StockTransferLine"("transferId");

-- CreateIndex
CREATE INDEX "StockTransferLine_itemId_idx" ON "StockTransferLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_issuedNumberId_key" ON "StockAdjustment"("issuedNumberId");

-- CreateIndex
CREATE INDEX "StockAdjustment_number_idx" ON "StockAdjustment"("number");

-- CreateIndex
CREATE INDEX "StockAdjustment_date_idx" ON "StockAdjustment"("date");

-- CreateIndex
CREATE INDEX "StockAdjustmentLine_adjustmentId_idx" ON "StockAdjustmentLine"("adjustmentId");

-- CreateIndex
CREATE INDEX "StockAdjustmentLine_itemId_idx" ON "StockAdjustmentLine"("itemId");

-- CreateIndex
CREATE INDEX "StockMoveDraw_transferLineId_idx" ON "StockMoveDraw"("transferLineId");

-- CreateIndex
CREATE INDEX "StockMoveDraw_adjustmentLineId_idx" ON "StockMoveDraw"("adjustmentLineId");

-- CreateIndex
CREATE INDEX "StockMoveDraw_batchId_idx" ON "StockMoveDraw"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_adjustmentLineId_key" ON "StockBatch"("adjustmentLineId");

-- CreateIndex
CREATE INDEX "StockBatch_transferLineId_idx" ON "StockBatch"("transferLineId");

-- CreateIndex
CREATE INDEX "StockBatch_sourceBatchId_idx" ON "StockBatch"("sourceBatchId");

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_transferLineId_fkey" FOREIGN KEY ("transferLineId") REFERENCES "StockTransferLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_adjustmentLineId_fkey" FOREIGN KEY ("adjustmentLineId") REFERENCES "StockAdjustmentLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromGodownId_fkey" FOREIGN KEY ("fromGodownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toGodownId_fkey" FOREIGN KEY ("toGodownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMoveDraw" ADD CONSTRAINT "StockMoveDraw_transferLineId_fkey" FOREIGN KEY ("transferLineId") REFERENCES "StockTransferLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMoveDraw" ADD CONSTRAINT "StockMoveDraw_adjustmentLineId_fkey" FOREIGN KEY ("adjustmentLineId") REFERENCES "StockAdjustmentLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMoveDraw" ADD CONSTRAINT "StockMoveDraw_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A batch has exactly one source: a goods bill line, a transfer line or an
-- adjustment line that added stock. Only a transfer batch names the batch
-- it was moved out of (null: the source godown's opening stock).
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_source_check"
  CHECK (num_nonnulls("billLineId", "transferLineId", "adjustmentLineId") = 1);
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_moved_from_check"
  CHECK ("sourceBatchId" IS NULL OR "transferLineId" IS NOT NULL);

ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_godowns_check" CHECK ("fromGodownId" <> "toGodownId");
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_value_check" CHECK ("value" >= 0);
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_cancel_check"
  CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL));
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_values_check" CHECK ("quantity" > 0 AND "value" >= 0);

ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_value_check" CHECK ("value" >= 0);
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_cancel_check"
  CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL));
-- The reason fixes the direction, except OTHER.
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_reason_check"
  CHECK ("reason" = 'OTHER'
    OR ("direction" = 'OUT' AND "reason" IN ('DAMAGED', 'LOST', 'CONSUMED', 'COUNT_SHORT'))
    OR ("direction" = 'IN' AND "reason" IN ('COUNT_EXCESS', 'FOUND')));
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_values_check"
  CHECK ("quantity" > 0 AND "value" >= 0 AND ("rate" IS NULL OR "rate" >= 0));

ALTER TABLE "StockMoveDraw" ADD CONSTRAINT "StockMoveDraw_parent_check"
  CHECK (num_nonnulls("transferLineId", "adjustmentLineId") = 1);
ALTER TABLE "StockMoveDraw" ADD CONSTRAINT "StockMoveDraw_values_check" CHECK ("quantity" > 0 AND "rate" >= 0);
