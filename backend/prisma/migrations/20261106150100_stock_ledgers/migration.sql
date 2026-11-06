-- The ledgers a stock adjustment's journal posts to, as Tally books them:
-- stock written off is an indirect expense and stock found an indirect
-- income, against "Stock Adjustment" under Purchase Accounts, which takes
-- the stock's cost out of (or into) the trading account while closing stock
-- falls (or rises) by the same amount. A ledger of the same name made by
-- hand is left alone.
INSERT INTO "Ledger" ("id", "name", "groupId", "systemRole", "notes", "updatedAt")
SELECT gen_random_uuid(), seed.name, g."id", seed.role::"LedgerRole", seed.notes, now()
FROM (VALUES
  ('Stock Written Off', 'Indirect Expenses', 'STOCK_WRITE_OFF', 'Damaged, lost or used stock, at what it cost (stock adjustments)'),
  ('Stock Excess Found', 'Indirect Incomes', 'STOCK_FOUND', 'Stock found or more on a count, at the cost entered (stock adjustments)'),
  ('Stock Adjustment', 'Purchase Accounts', 'STOCK_ADJUSTMENT', 'The trading side of stock adjustments; closing stock moves with it')
) AS seed(name, group_name, role, notes)
JOIN "LedgerGroup" g ON g."name" = seed.group_name AND g."parentId" IS NULL
ON CONFLICT ("name") DO NOTHING;
