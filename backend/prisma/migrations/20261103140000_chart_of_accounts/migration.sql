-- Chart of accounts: Tally's 28 groups, user sub-groups, general ledgers
-- (agent/accounts-plan.md, "Our chart of accounts"). Loans' asset and TDS
-- ledgers become links to general ledgers instead of typed names.

-- CreateEnum
CREATE TYPE "GroupNature" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "DrCr" AS ENUM ('DR', 'CR');

-- CreateEnum
CREATE TYPE "LedgerRole" AS ENUM ('PROFIT_AND_LOSS', 'CAPITAL', 'DRAWINGS', 'SALES_LOCAL', 'SALES_INTERSTATE', 'SALES_EXPORT_LUT', 'SALES_EXPORT_IGST', 'PURCHASE_LOCAL', 'PURCHASE_INTERSTATE', 'PURCHASE_NO_ITC', 'OUTPUT_CGST', 'OUTPUT_SGST', 'OUTPUT_IGST', 'INPUT_CGST', 'INPUT_SGST', 'INPUT_IGST', 'RCM_CGST', 'RCM_SGST', 'RCM_IGST', 'TDS_PAYABLE', 'TDS_RECEIVABLE', 'IGST_REFUND', 'ROUND_OFF');

-- CreateEnum
CREATE TYPE "TaxKind" AS ENUM ('CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS', 'OTHER');

-- CreateTable
CREATE TABLE "LedgerGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "nature" "GroupNature",
    "affectsGrossProfit" BOOLEAN NOT NULL DEFAULT false,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "behavesAsSubLedger" BOOLEAN NOT NULL DEFAULT false,
    "nettBalances" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" UUID,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingSide" "DrCr" NOT NULL DEFAULT 'DR',
    "systemRole" "LedgerRole",
    "taxKind" "TaxKind",
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerGroup_name_key" ON "LedgerGroup"("name");
CREATE INDEX "LedgerGroup_parentId_idx" ON "LedgerGroup"("parentId");
CREATE UNIQUE INDEX "Ledger_name_key" ON "Ledger"("name");
CREATE UNIQUE INDEX "Ledger_systemRole_key" ON "Ledger"("systemRole");
CREATE INDEX "Ledger_groupId_idx" ON "Ledger"("groupId");

ALTER TABLE "LedgerGroup" ADD CONSTRAINT "LedgerGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LedgerGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LedgerGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Names go to Tally as they are (LEDGER_NAME_PATTERN). A primary group has
-- a nature, a sub-group takes its parent's; only primary income and expense
-- groups say whether they affect gross profit.
ALTER TABLE "LedgerGroup" ADD CONSTRAINT "LedgerGroup_name" CHECK ("name" ~ '^[A-Za-z0-9][A-Za-z0-9 &.,()/''-]{1,59}$');
ALTER TABLE "LedgerGroup" ADD CONSTRAINT "LedgerGroup_nature" CHECK (("parentId" IS NULL) = ("nature" IS NOT NULL));
ALTER TABLE "LedgerGroup" ADD CONSTRAINT "LedgerGroup_grossProfit" CHECK (
  NOT "affectsGrossProfit" OR "nature" IN ('INCOME', 'EXPENSE')
);
ALTER TABLE "LedgerGroup" ADD CONSTRAINT "LedgerGroup_notSelf" CHECK ("parentId" IS NULL OR "parentId" <> "id");

-- Only Profit & Loss A/c sits under Primary; a tax kind only with a group.
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_name" CHECK ("name" ~ '^[A-Za-z0-9][A-Za-z0-9 &.,()/''-]{1,59}$');
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_primary" CHECK (("groupId" IS NULL) = ("systemRole" IS NOT DISTINCT FROM 'PROFIT_AND_LOSS'));
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_opening" CHECK ("openingBalance" >= 0);
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_system" CHECK ("systemRole" IS NULL OR NOT "isArchived");

-- TallyPrime's 28 predefined groups. Positions follow Tally's Balance Sheet
-- and Profit & Loss order.
INSERT INTO "LedgerGroup" ("id", "name", "parentId", "nature", "affectsGrossProfit", "isPredefined", "position", "updatedAt") VALUES
  (gen_random_uuid(), 'Capital Account', NULL, 'LIABILITY', false, true, 10, now()),
  (gen_random_uuid(), 'Loans (Liability)', NULL, 'LIABILITY', false, true, 20, now()),
  (gen_random_uuid(), 'Current Liabilities', NULL, 'LIABILITY', false, true, 30, now()),
  (gen_random_uuid(), 'Branch / Divisions', NULL, 'LIABILITY', false, true, 40, now()),
  (gen_random_uuid(), 'Suspense A/c', NULL, 'LIABILITY', false, true, 50, now()),
  (gen_random_uuid(), 'Fixed Assets', NULL, 'ASSET', false, true, 60, now()),
  (gen_random_uuid(), 'Investments', NULL, 'ASSET', false, true, 70, now()),
  (gen_random_uuid(), 'Current Assets', NULL, 'ASSET', false, true, 80, now()),
  (gen_random_uuid(), 'Misc. Expenses (ASSET)', NULL, 'ASSET', false, true, 90, now()),
  (gen_random_uuid(), 'Sales Accounts', NULL, 'INCOME', true, true, 100, now()),
  (gen_random_uuid(), 'Direct Incomes', NULL, 'INCOME', true, true, 110, now()),
  (gen_random_uuid(), 'Indirect Incomes', NULL, 'INCOME', false, true, 120, now()),
  (gen_random_uuid(), 'Purchase Accounts', NULL, 'EXPENSE', true, true, 130, now()),
  (gen_random_uuid(), 'Direct Expenses', NULL, 'EXPENSE', true, true, 140, now()),
  (gen_random_uuid(), 'Indirect Expenses', NULL, 'EXPENSE', false, true, 150, now());

INSERT INTO "LedgerGroup" ("id", "name", "parentId", "isPredefined", "behavesAsSubLedger", "position", "updatedAt")
SELECT gen_random_uuid(), sub.name, parent."id", true, sub.folded, sub.position, now()
FROM (VALUES
  ('Reserves & Surplus', 'Capital Account', false, 1),
  ('Bank OD A/c', 'Loans (Liability)', false, 1),
  ('Secured Loans', 'Loans (Liability)', false, 2),
  ('Unsecured Loans', 'Loans (Liability)', false, 3),
  ('Duties & Taxes', 'Current Liabilities', false, 1),
  ('Provisions', 'Current Liabilities', false, 2),
  ('Sundry Creditors', 'Current Liabilities', true, 3),
  ('Bank Accounts', 'Current Assets', false, 1),
  ('Cash-in-Hand', 'Current Assets', false, 2),
  ('Deposits (Asset)', 'Current Assets', false, 3),
  ('Loans & Advances (Asset)', 'Current Assets', false, 4),
  ('Stock-in-Hand', 'Current Assets', false, 5),
  ('Sundry Debtors', 'Current Assets', true, 6)
) AS sub(name, parent_name, folded, position)
JOIN "LedgerGroup" parent ON parent."name" = sub.parent_name;

-- The ledgers the app posts to (agent/accounts-plan.md, "System ledgers").
-- Tally's other predefined ledger, Cash, is the cash account in Bank & cash.
INSERT INTO "Ledger" ("id", "name", "groupId", "systemRole", "taxKind", "notes", "updatedAt") VALUES
  (gen_random_uuid(), 'Profit & Loss A/c', NULL, 'PROFIT_AND_LOSS', NULL, 'Profit or loss brought forward (opening balance)', now());

INSERT INTO "Ledger" ("id", "name", "groupId", "systemRole", "taxKind", "notes", "updatedAt")
SELECT gen_random_uuid(), seed.name, g."id", seed.role::"LedgerRole", seed.tax::"TaxKind", seed.notes, now()
FROM (VALUES
  ('Owner''s Capital', 'Capital Account', 'CAPITAL', NULL, 'Money the owners bring into the business'),
  ('Drawings', 'Capital Account', 'DRAWINGS', NULL, 'Money and goods the owners take out'),
  ('Sales - GST Local', 'Sales Accounts', 'SALES_LOCAL', NULL, 'Invoices to buyers in our state (CGST + SGST)'),
  ('Sales - GST Interstate', 'Sales Accounts', 'SALES_INTERSTATE', NULL, 'Invoices to buyers in other states (IGST)'),
  ('Export Sales - LUT', 'Sales Accounts', 'SALES_EXPORT_LUT', NULL, 'Exports to Bhutan under LUT, no GST'),
  ('Export Sales - IGST', 'Sales Accounts', 'SALES_EXPORT_IGST', NULL, 'Exports with IGST paid and claimed back'),
  ('Purchase - GST Local', 'Purchase Accounts', 'PURCHASE_LOCAL', NULL, 'Goods bills from vendors in our state'),
  ('Purchase - GST Interstate', 'Purchase Accounts', 'PURCHASE_INTERSTATE', NULL, 'Goods bills from vendors in other states'),
  ('Purchase - No Input Credit', 'Purchase Accounts', 'PURCHASE_NO_ITC', NULL, 'Unregistered or composition vendors, 17(5): GST is cost'),
  ('Output CGST', 'Duties & Taxes', 'OUTPUT_CGST', 'CGST', 'CGST on sales'),
  ('Output SGST', 'Duties & Taxes', 'OUTPUT_SGST', 'SGST', 'SGST on sales'),
  ('Output IGST', 'Duties & Taxes', 'OUTPUT_IGST', 'IGST', 'IGST on sales and exports with IGST'),
  ('Input CGST', 'Duties & Taxes', 'INPUT_CGST', 'CGST', 'Claimable CGST on bills and expenses'),
  ('Input SGST', 'Duties & Taxes', 'INPUT_SGST', 'SGST', 'Claimable SGST on bills and expenses'),
  ('Input IGST', 'Duties & Taxes', 'INPUT_IGST', 'IGST', 'Claimable IGST on bills and expenses'),
  ('CGST Payable on RCM', 'Duties & Taxes', 'RCM_CGST', 'CGST', 'Reverse charge on GTA freight'),
  ('SGST Payable on RCM', 'Duties & Taxes', 'RCM_SGST', 'SGST', 'Reverse charge on GTA freight'),
  ('IGST Payable on RCM', 'Duties & Taxes', 'RCM_IGST', 'IGST', 'Reverse charge on GTA freight'),
  ('TDS Payable on Interest', 'Duties & Taxes', 'TDS_PAYABLE', 'TDS', 'TDS we deduct on interest we pay'),
  ('TDS Receivable', 'Loans & Advances (Asset)', 'TDS_RECEIVABLE', NULL, 'TDS borrowers deduct on interest they pay us'),
  ('IGST Refund Receivable', 'Loans & Advances (Asset)', 'IGST_REFUND', NULL, 'IGST paid on exports, to be refunded'),
  ('Round Off', 'Indirect Expenses', 'ROUND_OFF', NULL, 'Rounding on invoices and bills')
) AS seed(name, group_name, role, tax, notes)
JOIN "LedgerGroup" g ON g."name" = seed.group_name;

-- Loans: typed asset and TDS ledger names become general ledgers (matched by
-- name, ignoring case, or created on the right group).
ALTER TABLE "Loan" ADD COLUMN "assetLedgerId" UUID, ADD COLUMN "tdsLedgerId" UUID;

INSERT INTO "Ledger" ("id", "name", "groupId", "notes", "updatedAt")
SELECT DISTINCT ON (lower(l."assetLedgerName")) gen_random_uuid(), l."assetLedgerName", g."id", 'Asset bought with a loan', now()
FROM "Loan" l JOIN "LedgerGroup" g ON g."name" = 'Fixed Assets'
WHERE l."assetLedgerName" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Ledger" x WHERE lower(x."name") = lower(l."assetLedgerName"))
ORDER BY lower(l."assetLedgerName"), l."createdAt";

INSERT INTO "Ledger" ("id", "name", "groupId", "taxKind", "notes", "updatedAt")
SELECT DISTINCT ON (lower(l."tdsLedgerName")) gen_random_uuid(), l."tdsLedgerName", g."id",
  CASE WHEN l."direction" = 'TAKEN' THEN 'TDS'::"TaxKind" END, 'TDS ledger of a loan', now()
FROM "Loan" l
JOIN "LedgerGroup" g ON g."name" = CASE WHEN l."direction" = 'TAKEN' THEN 'Duties & Taxes' ELSE 'Loans & Advances (Asset)' END
WHERE l."tdsLedgerName" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Ledger" x WHERE lower(x."name") = lower(l."tdsLedgerName"))
ORDER BY lower(l."tdsLedgerName"), l."createdAt";

UPDATE "Loan" l SET "assetLedgerId" = x."id" FROM "Ledger" x WHERE lower(x."name") = lower(l."assetLedgerName");
UPDATE "Loan" l SET "tdsLedgerId" = x."id" FROM "Ledger" x WHERE lower(x."name") = lower(l."tdsLedgerName");

ALTER TABLE "Loan" DROP CONSTRAINT "Loan_disbursal";
ALTER TABLE "Loan" DROP COLUMN "assetLedgerName", DROP COLUMN "tdsLedgerName";

-- Each disbursal kind carries its own field and no other (as in 20261103070000_loan_kinds).
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursal" CHECK (
  CASE "disbursal"
    WHEN 'BEFORE_BOOKS' THEN "openingOutstanding" > 0 AND "disbursalAccountId" IS NULL AND "assetLedgerId" IS NULL
      AND ("repayment" = 'FLEXIBLE' OR ("paidBefore" BETWEEN 0 AND "tenureMonths" - 1 AND "openingOutstanding" <= "principal"))
    WHEN 'THROUGH_BANK' THEN "disbursalAccountId" IS NOT NULL AND "assetLedgerId" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
    ELSE "assetLedgerId" IS NOT NULL AND "disbursalAccountId" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
  END
);

CREATE INDEX "Loan_assetLedgerId_idx" ON "Loan"("assetLedgerId");
CREATE INDEX "Loan_tdsLedgerId_idx" ON "Loan"("tdsLedgerId");
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_assetLedgerId_fkey" FOREIGN KEY ("assetLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tdsLedgerId_fkey" FOREIGN KEY ("tdsLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
