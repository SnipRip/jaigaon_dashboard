-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseBillKind" AS ENUM ('GOODS', 'CHARGES');

-- CreateEnum
CREATE TYPE "PurchaseBillStatus" AS ENUM ('OPEN', 'VOID');

-- CreateEnum
CREATE TYPE "LandedCostMethod" AS ENUM ('VALUE', 'QUANTITY', 'WEIGHT');

-- CreateEnum
CREATE TYPE "PurchaseRegime" AS ENUM ('INTRA_STATE', 'INTER_STATE', 'NO_GST', 'REVERSE_CHARGE', 'IMPORT');

-- AlterEnum
ALTER TYPE "NumberedKind" ADD VALUE 'PURCHASE_ORDER';

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID,
    "date" DATE NOT NULL,
    "expectedDate" DATE,
    "vendorId" UUID NOT NULL,
    "godownId" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'OPEN',
    "terms" TEXT,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gstRatePct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBill" (
    "id" UUID NOT NULL,
    "kind" "PurchaseBillKind" NOT NULL,
    "reference" TEXT NOT NULL,
    "issuedNumberId" UUID,
    "vendorBillNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "vendorId" UUID NOT NULL,
    "sourceOfSupply" TEXT,
    "regime" "PurchaseRegime" NOT NULL,
    "godownId" UUID,
    "purchaseOrderId" UUID,
    "allocation" "LandedCostMethod" NOT NULL DEFAULT 'VALUE',
    "landedCostForId" UUID,
    "ewayBillNumber" TEXT,
    "ewayBillDate" DATE,
    "vehicleNumber" TEXT,
    "notes" TEXT,
    "status" "PurchaseBillStatus" NOT NULL DEFAULT 'OPEN',
    "goodsValue" DECIMAL(14,2) NOT NULL,
    "chargesValue" DECIMAL(14,2) NOT NULL,
    "taxable" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL,
    "sgst" DECIMAL(14,2) NOT NULL,
    "igst" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "itcClaimable" DECIMAL(14,2) NOT NULL,
    "itcLost" DECIMAL(14,2) NOT NULL,
    "roundOff" DECIMAL(6,2) NOT NULL,
    "payable" DECIMAL(14,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillLine" (
    "id" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "itemId" UUID NOT NULL,
    "orderLineId" UUID,
    "description" TEXT NOT NULL,
    "hsn" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gstRatePct" DECIMAL(5,2) NOT NULL,
    "itcEligible" BOOLEAN NOT NULL DEFAULT true,
    "taxable" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "ownCost" DECIMAL(14,2) NOT NULL,
    "landedShare" DECIMAL(14,2) NOT NULL,
    "landedCost" DECIMAL(14,2) NOT NULL,
    "landedRate" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "PurchaseBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillCharge" (
    "id" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "headId" UUID NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "gstRatePct" DECIMAL(5,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseBillCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "godownId" UUID NOT NULL,
    "billLineId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "remaining" DECIMAL(14,3) NOT NULL,
    "landedRate" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_date_idx" ON "PurchaseOrder"("vendorId", "date");

-- CreateIndex
CREATE INDEX "PurchaseOrder_date_idx" ON "PurchaseOrder"("date");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_orderId_idx" ON "PurchaseOrderLine"("orderId");

-- CreateIndex
CREATE INDEX "PurchaseBill_date_idx" ON "PurchaseBill"("date");

-- CreateIndex
CREATE INDEX "PurchaseBill_purchaseOrderId_idx" ON "PurchaseBill"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseBill_landedCostForId_idx" ON "PurchaseBill"("landedCostForId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_vendorId_vendorBillNumber_key" ON "PurchaseBill"("vendorId", "vendorBillNumber");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_billId_idx" ON "PurchaseBillLine"("billId");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_itemId_idx" ON "PurchaseBillLine"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_orderLineId_idx" ON "PurchaseBillLine"("orderLineId");

-- CreateIndex
CREATE INDEX "PurchaseBillCharge_billId_idx" ON "PurchaseBillCharge"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_billLineId_key" ON "StockBatch"("billLineId");

-- CreateIndex
CREATE INDEX "StockBatch_itemId_date_idx" ON "StockBatch"("itemId", "date");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_landedCostForId_fkey" FOREIGN KEY ("landedCostForId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillCharge" ADD CONSTRAINT "PurchaseBillCharge_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillCharge" ADD CONSTRAINT "PurchaseBillCharge_headId_fkey" FOREIGN KEY ("headId") REFERENCES "AccountHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_billLineId_fkey" FOREIGN KEY ("billLineId") REFERENCES "PurchaseBillLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The same rules src/purchases/purchase-rules.ts checks before a save.
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_values_check"
  CHECK ("quantity" > 0 AND "rate" >= 0 AND "discountPct" >= 0 AND "discountPct" < 100 AND "gstRatePct" >= 0);
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_dates_check"
  CHECK ("expectedDate" IS NULL OR "expectedDate" >= "date");
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_dates_check" CHECK ("dueDate" >= "date");
-- A goods bill has a godown and is never tagged to another bill; a charges bill has no godown or order.
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_kind_check" CHECK (
  ("kind" = 'GOODS' AND "godownId" IS NOT NULL AND "landedCostForId" IS NULL)
  OR ("kind" = 'CHARGES' AND "godownId" IS NULL AND "purchaseOrderId" IS NULL));
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_amounts_check"
  CHECK ("taxable" >= 0 AND "tax" >= 0 AND "payable" >= 0 AND "cost" >= 0 AND "itcLost" >= 0);
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_values_check"
  CHECK ("quantity" > 0 AND "rate" >= 0 AND "discountPct" >= 0 AND "discountPct" < 100 AND "gstRatePct" >= 0 AND "landedRate" >= 0);
ALTER TABLE "PurchaseBillCharge" ADD CONSTRAINT "PurchaseBillCharge_values_check"
  CHECK ("amount" > 0 AND "gstRatePct" >= 0);
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_quantity_check"
  CHECK ("quantity" > 0 AND "remaining" >= 0 AND "remaining" <= "quantity" AND "landedRate" >= 0);
-- A document number is unique among live documents of its kind (IssuedNumber
-- holds the register; this keeps the documents themselves honest too).
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");
CREATE UNIQUE INDEX "PurchaseBill_reference_key" ON "PurchaseBill"("reference");
