-- The PURCHASE_ORDER kind added in 20261105054403_purchases gets its series,
-- like the JOURNAL one in 20261103070100_journal_series. A new enum value can
-- only be used once the migration that added it has committed.
INSERT INTO "NumberSeries" ("id", "kind", "method", "tallyVoucherType", "updatedAt")
VALUES (gen_random_uuid(), 'PURCHASE_ORDER', 'AUTOMATIC', 'Purchase Order', now());
