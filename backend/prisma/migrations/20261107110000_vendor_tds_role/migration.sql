-- System ledger for TDS we deduct on vendor payments (seeded in
-- 20261107110100_vendor_tds_ledger; a new enum value can only be used once
-- this migration has committed).
ALTER TYPE "LedgerRole" ADD VALUE 'TDS_PAYABLE_VENDOR';
