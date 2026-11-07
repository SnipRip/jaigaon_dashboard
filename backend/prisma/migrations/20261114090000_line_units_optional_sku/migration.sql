-- Optional SKU, an item's reporting unit for GST returns, and document lines
-- entered in any of the item's units (stock and cost stay in the base unit).

-- Item: SKU optional (the unique index allows many nulls), reporting unit.
ALTER TABLE "Item" ALTER COLUMN "sku" DROP NOT NULL;
ALTER TABLE "ItemGroup" ALTER COLUMN "skuPrefix" DROP NOT NULL;
ALTER TABLE "Item" ADD COLUMN "reportingUnitId" UUID;
ALTER TABLE "Item" ADD CONSTRAINT "Item_reportingUnitId_fkey" FOREIGN KEY ("reportingUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Base rates keep four decimals: a rate typed per bag divided down to a kg.
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,4);
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,4);
ALTER TABLE "QuotationLine" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,4);
ALTER TABLE "InvoiceLine" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(14,4);

-- Every existing line was entered in the base unit.
ALTER TABLE "PurchaseOrderLine"
  ADD COLUMN "lineUnit" TEXT,
  ADD COLUMN "lineQuantity" DECIMAL(14,3),
  ADD COLUMN "lineRate" DECIMAL(12,2),
  ADD COLUMN "unitFactor" DECIMAL(14,4) NOT NULL DEFAULT 1;
UPDATE "PurchaseOrderLine" SET "lineQuantity" = "quantity", "lineRate" = ROUND("rate", 2);
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "lineQuantity" SET NOT NULL, ALTER COLUMN "lineRate" SET NOT NULL;

ALTER TABLE "PurchaseBillLine"
  ADD COLUMN "lineUnit" TEXT,
  ADD COLUMN "lineQuantity" DECIMAL(14,3),
  ADD COLUMN "lineRate" DECIMAL(12,2),
  ADD COLUMN "unitFactor" DECIMAL(14,4) NOT NULL DEFAULT 1;
UPDATE "PurchaseBillLine" SET "lineQuantity" = "quantity", "lineRate" = ROUND("rate", 2);
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "lineQuantity" SET NOT NULL, ALTER COLUMN "lineRate" SET NOT NULL;

ALTER TABLE "QuotationLine"
  ADD COLUMN "lineUnit" TEXT,
  ADD COLUMN "lineQuantity" DECIMAL(14,3),
  ADD COLUMN "lineRate" DECIMAL(12,2),
  ADD COLUMN "unitFactor" DECIMAL(14,4) NOT NULL DEFAULT 1;
UPDATE "QuotationLine" SET "lineQuantity" = "quantity", "lineRate" = ROUND("rate", 2);
ALTER TABLE "QuotationLine" ALTER COLUMN "lineQuantity" SET NOT NULL, ALTER COLUMN "lineRate" SET NOT NULL;

ALTER TABLE "InvoiceLine"
  ADD COLUMN "lineUnit" TEXT,
  ADD COLUMN "lineQuantity" DECIMAL(14,3),
  ADD COLUMN "lineRate" DECIMAL(12,2),
  ADD COLUMN "unitFactor" DECIMAL(14,4) NOT NULL DEFAULT 1,
  ADD COLUMN "reportUnit" TEXT,
  ADD COLUMN "reportQuantity" DECIMAL(14,3);
UPDATE "InvoiceLine" SET "lineQuantity" = "quantity", "lineRate" = ROUND("rate", 2), "reportUnit" = "unit", "reportQuantity" = "quantity";
ALTER TABLE "InvoiceLine"
  ALTER COLUMN "lineQuantity" SET NOT NULL,
  ALTER COLUMN "lineRate" SET NOT NULL,
  ALTER COLUMN "reportUnit" SET NOT NULL,
  ALTER COLUMN "reportQuantity" SET NOT NULL;
