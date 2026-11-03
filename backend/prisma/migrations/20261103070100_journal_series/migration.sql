-- The JOURNAL kind added in 20261103070000_loan_kinds gets its series, like
-- the others seeded in 20261103045732_numbering. A new enum value can only be
-- used once the migration that added it has committed, hence its own file.
INSERT INTO "NumberSeries" ("id", "kind", "method", "tallyVoucherType", "updatedAt")
VALUES (gen_random_uuid(), 'JOURNAL', 'AUTOMATIC', 'Journal', now());
