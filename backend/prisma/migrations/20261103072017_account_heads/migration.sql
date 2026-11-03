-- CreateEnum
CREATE TYPE "HeadNature" AS ENUM ('DIRECT_EXPENSE', 'INDIRECT_EXPENSE', 'DIRECT_INCOME', 'INDIRECT_INCOME');

-- CreateEnum
CREATE TYPE "HeadGst" AS ENUM ('FOLLOWS_BILL', 'OWN_RATE', 'NONE');

-- CreateEnum
CREATE TYPE "HeadAllocation" AS ENUM ('ITEM_COST', 'INVOICE', 'SHIPMENT', 'OVERHEAD');

-- CreateTable
CREATE TABLE "AccountHead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "HeadNature" NOT NULL,
    "gst" "HeadGst",
    "gstRatePct" DECIMAL(5,2),
    "allocation" "HeadAllocation",
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountHead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountHead_name_key" ON "AccountHead"("name");

-- The service checks these too (account-head-rules.ts); the database keeps them true.
-- The name goes to Tally as the ledger name (LEDGER_NAME_PATTERN).
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_name" CHECK ("name" ~ '^[A-Za-z0-9][A-Za-z0-9 &.,()/''-]{1,59}$');
-- An expense head has its GST behaviour and where its cost lands; an income
-- head has neither.
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_expense_fields" CHECK (
  CASE WHEN "nature" IN ('DIRECT_EXPENSE', 'INDIRECT_EXPENSE')
    THEN "gst" IS NOT NULL AND "allocation" IS NOT NULL
    ELSE "gst" IS NULL AND "gstRatePct" IS NULL AND "allocation" IS NULL
  END
);
-- A rate only with OWN_RATE, and then one of the GST slabs.
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_gst_rate" CHECK (
  CASE WHEN "gst" = 'OWN_RATE'
    THEN "gstRatePct" IN (5, 12, 18, 28, 40)
    ELSE "gstRatePct" IS NULL
  END
);
-- An indirect expense runs the business; it is not part of one sale's cost.
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_indirect_overhead" CHECK ("nature" <> 'INDIRECT_EXPENSE' OR "allocation" = 'OVERHEAD');

-- Starting heads. Bank Charges, Interest on Loan and Interest Received are
-- the ledgers loan entries post to (src/common/tally/tally-groups.ts).
INSERT INTO "AccountHead" ("id", "name", "nature", "gst", "gstRatePct", "allocation", "notes", "updatedAt") VALUES
  (gen_random_uuid(), 'Freight Inward', 'DIRECT_EXPENSE', 'FOLLOWS_BILL', NULL, 'ITEM_COST', 'Transport of purchased goods to our yard', now()),
  (gen_random_uuid(), 'Unloading Charges', 'DIRECT_EXPENSE', 'NONE', NULL, 'ITEM_COST', NULL, now()),
  (gen_random_uuid(), 'Loading Charges', 'DIRECT_EXPENSE', 'NONE', NULL, 'INVOICE', NULL, now()),
  (gen_random_uuid(), 'Labour Charges', 'DIRECT_EXPENSE', 'NONE', NULL, 'ITEM_COST', 'Stacking, sorting, cutting', now()),
  (gen_random_uuid(), 'Freight Outward', 'DIRECT_EXPENSE', 'OWN_RATE', 5, 'SHIPMENT', NULL, now()),
  (gen_random_uuid(), 'Customs Agent (CHA) Fees', 'DIRECT_EXPENSE', 'OWN_RATE', 18, 'SHIPMENT', NULL, now()),
  (gen_random_uuid(), 'Border and LCS Charges', 'DIRECT_EXPENSE', 'NONE', NULL, 'SHIPMENT', NULL, now()),
  (gen_random_uuid(), 'Bank Charges', 'INDIRECT_EXPENSE', 'OWN_RATE', 18, 'OVERHEAD', 'Also bounce and penal charges on loans', now()),
  (gen_random_uuid(), 'Interest on Loan', 'INDIRECT_EXPENSE', 'NONE', NULL, 'OVERHEAD', 'Interest on loans we take', now()),
  (gen_random_uuid(), 'Rent', 'INDIRECT_EXPENSE', 'OWN_RATE', 18, 'OVERHEAD', NULL, now()),
  (gen_random_uuid(), 'Salary', 'INDIRECT_EXPENSE', 'NONE', NULL, 'OVERHEAD', NULL, now()),
  (gen_random_uuid(), 'Repairs and Maintenance', 'INDIRECT_EXPENSE', 'OWN_RATE', 18, 'OVERHEAD', NULL, now()),
  (gen_random_uuid(), 'Office Expenses', 'INDIRECT_EXPENSE', 'OWN_RATE', 18, 'OVERHEAD', 'Stationery, small equipment', now()),
  (gen_random_uuid(), 'Interest Received', 'INDIRECT_INCOME', NULL, NULL, NULL, 'Interest on loans we give', now()),
  (gen_random_uuid(), 'Interest on Late Payment', 'INDIRECT_INCOME', NULL, NULL, NULL, 'Charged to buyers who pay late (MSME)', now()),
  (gen_random_uuid(), 'Discount Received', 'INDIRECT_INCOME', NULL, NULL, NULL, NULL, now()),
  (gen_random_uuid(), 'Commission Received', 'INDIRECT_INCOME', NULL, NULL, NULL, NULL, now());
