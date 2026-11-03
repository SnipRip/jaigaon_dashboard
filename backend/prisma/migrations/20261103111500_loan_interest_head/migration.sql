-- A loan's interest ledger becomes a pointer to an expense head (loans we
-- take) or an income head (loans we give) instead of a typed name.
ALTER TABLE "Loan" ADD COLUMN "interestHeadId" UUID;

-- A typed name no head carries becomes a head on the loan's side, so no
-- ledger is lost: interest paid is an indirect expense (overhead, no GST),
-- interest received an indirect income.
INSERT INTO "AccountHead" ("id", "name", "nature", "gst", "gstRatePct", "allocation", "notes", "updatedAt")
SELECT DISTINCT ON (lower(l."interestLedgerName"))
  gen_random_uuid(),
  l."interestLedgerName",
  CASE WHEN l."direction" = 'TAKEN' THEN 'INDIRECT_EXPENSE'::"HeadNature" ELSE 'INDIRECT_INCOME'::"HeadNature" END,
  CASE WHEN l."direction" = 'TAKEN' THEN 'NONE'::"HeadGst" END,
  NULL,
  CASE WHEN l."direction" = 'TAKEN' THEN 'OVERHEAD'::"HeadAllocation" END,
  'Interest ledger of a loan',
  now()
FROM "Loan" l
WHERE l."interestLedgerName" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "AccountHead" h WHERE lower(h."name") = lower(l."interestLedgerName"))
ORDER BY lower(l."interestLedgerName"), l."createdAt";

UPDATE "Loan" l
SET "interestHeadId" = h."id"
FROM "AccountHead" h
WHERE lower(h."name") = lower(l."interestLedgerName");

ALTER TABLE "Loan" DROP COLUMN "interestLedgerName";

-- CreateIndex
CREATE INDEX "Loan_interestHeadId_idx" ON "Loan"("interestHeadId");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_interestHeadId_fkey" FOREIGN KEY ("interestHeadId") REFERENCES "AccountHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
