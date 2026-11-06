-- Receipts and payments post to the books (src/books/settlement-postings.ts).
-- TDS a customer deducts goes to TDS Receivable, as on loans; TDS we deduct
-- when paying a vendor (194C, 194Q) is owed to the government under its own
-- ledger, apart from TDS on interest. A ledger of the same name made by hand
-- is left alone.
INSERT INTO "Ledger" ("id", "name", "groupId", "systemRole", "taxKind", "notes", "updatedAt")
SELECT gen_random_uuid(), 'TDS Payable on Vendor Payments', g."id", 'TDS_PAYABLE_VENDOR'::"LedgerRole", 'TDS'::"TaxKind",
  'TDS we deduct when paying vendors (receipts and payments)', now()
FROM "LedgerGroup" g WHERE g."name" = 'Duties & Taxes'
ON CONFLICT ("name") DO NOTHING;

UPDATE "Ledger" SET "notes" = 'TDS deducted from what we are paid: customers on receipts, borrowers on interest'
WHERE "systemRole" = 'TDS_RECEIVABLE' AND "notes" = 'TDS borrowers deduct on interest they pay us';
