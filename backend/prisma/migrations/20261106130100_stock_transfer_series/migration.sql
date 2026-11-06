-- The STOCK_TRANSFER kind added in 20261106130000_stock_moves gets its series
-- (a new enum value can only be used once the migration that added it has
-- committed). Tally records a godown transfer as a Stock Journal.
INSERT INTO "NumberSeries" ("id", "kind", "method", "tallyVoucherType", "updatedAt")
VALUES (gen_random_uuid(), 'STOCK_TRANSFER', 'AUTOMATIC', 'Stock Journal', now());
