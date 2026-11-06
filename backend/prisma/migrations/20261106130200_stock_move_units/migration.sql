-- Each transfer and adjustment line keeps its base unit as saved, as invoice
-- lines do. Both tables are new and empty, so the column needs no default.
ALTER TABLE "StockTransferLine" ADD COLUMN "unit" TEXT NOT NULL;
ALTER TABLE "StockAdjustmentLine" ADD COLUMN "unit" TEXT NOT NULL;
