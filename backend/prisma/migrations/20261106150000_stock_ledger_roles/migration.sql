-- System ledgers stock adjustments post to (seeded in 20261106150100_stock_ledgers;
-- a new enum value can only be used once this migration has committed).
ALTER TYPE "LedgerRole" ADD VALUE 'STOCK_WRITE_OFF';
ALTER TYPE "LedgerRole" ADD VALUE 'STOCK_FOUND';
ALTER TYPE "LedgerRole" ADD VALUE 'STOCK_ADJUSTMENT';
