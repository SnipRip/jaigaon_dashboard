-- The first loans CHECKs name columns and enum values this migration changes;
-- they are recreated at the end for every direction and repayment style.
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_amounts";
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_disbursal";
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_security";

-- CreateEnum
CREATE TYPE "LoanDirection" AS ENUM ('TAKEN', 'GIVEN');

-- CreateEnum
CREATE TYPE "LoanRepayment" AS ENUM ('EMI', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "InterestFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY');

-- CreateEnum
CREATE TYPE "LoanEntryKind" AS ENUM ('EMI', 'PRINCIPAL', 'INTEREST', 'INTEREST_ADDED', 'DRAWDOWN');

-- AlterEnum
BEGIN;
CREATE TYPE "LoanDisbursal_new" AS ENUM ('BEFORE_BOOKS', 'THROUGH_BANK', 'PAID_TO_SELLER');
ALTER TABLE "Loan" ALTER COLUMN "disbursal" TYPE "LoanDisbursal_new" USING ("disbursal"::text::"LoanDisbursal_new");
ALTER TYPE "LoanDisbursal" RENAME TO "LoanDisbursal_old";
ALTER TYPE "LoanDisbursal_new" RENAME TO "LoanDisbursal";
DROP TYPE "public"."LoanDisbursal_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LoanKind" ADD VALUE 'GOLD';
ALTER TYPE "LoanKind" ADD VALUE 'OWNER';
ALTER TYPE "LoanKind" ADD VALUE 'STAFF';
ALTER TYPE "LoanKind" ADD VALUE 'DEPOSIT';

-- AlterEnum
ALTER TYPE "NumberedKind" ADD VALUE 'JOURNAL';

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_disbursedIntoId_fkey";

-- DropForeignKey
ALTER TABLE "LoanPayment" DROP CONSTRAINT "LoanPayment_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "LoanPayment" DROP CONSTRAINT "LoanPayment_loanId_fkey";

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "disbursedIntoId",
DROP COLUMN "lenderName",
ADD COLUMN     "direction" "LoanDirection" NOT NULL,
ADD COLUMN     "disbursalAccountId" UUID,
ADD COLUMN     "firstInterestDate" DATE,
ADD COLUMN     "interestFrequency" "InterestFrequency",
ADD COLUMN     "maturityDate" DATE,
ADD COLUMN     "partyName" TEXT NOT NULL,
ADD COLUMN     "repayment" "LoanRepayment" NOT NULL,
ADD COLUMN     "tdsLedgerName" TEXT,
ADD COLUMN     "tdsRatePct" DECIMAL(5,2),
ALTER COLUMN "tenureMonths" DROP NOT NULL,
ALTER COLUMN "emiAmount" DROP NOT NULL,
ALTER COLUMN "firstEmiDate" DROP NOT NULL;

-- DropTable
DROP TABLE "LoanPayment";

-- CreateTable
CREATE TABLE "LoanEntry" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "kind" "LoanEntryKind" NOT NULL,
    "instalmentNo" INTEGER,
    "entryDate" DATE NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "charges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankAccountId" UUID,
    "reference" TEXT,
    "voucherNumber" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanEntry_issuedNumberId_key" ON "LoanEntry"("issuedNumberId");

-- CreateIndex
CREATE INDEX "LoanEntry_loanId_entryDate_idx" ON "LoanEntry"("loanId", "entryDate");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursalAccountId_fkey" FOREIGN KEY ("disbursalAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanEntry" ADD CONSTRAINT "LoanEntry_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanEntry" ADD CONSTRAINT "LoanEntry_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- The service checks these too (loan-rules.ts, loan-kinds.ts); the database keeps them true.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_amounts" CHECK (
  "principal" > 0
  AND "interestRatePct" >= 0 AND "interestRatePct" <= 50
  AND ("tdsRatePct" IS NULL OR ("tdsRatePct" > 0 AND "tdsRatePct" <= 30))
  AND "reminderDays" BETWEEN 0 AND 30
  AND ("maturityDate" IS NULL OR "maturityDate" >= "disbursedOn")
);
-- Kinds that fit each direction; only a loan we take is bought-with or paid to a seller.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_direction" CHECK (
  CASE "direction"
    WHEN 'TAKEN' THEN "kind" IN ('VEHICLE', 'EQUIPMENT', 'PROPERTY', 'BUSINESS', 'GOLD', 'OWNER', 'OTHER')
    ELSE "kind" IN ('BUSINESS', 'STAFF', 'DEPOSIT', 'OTHER') AND "disbursal" <> 'PAID_TO_SELLER'
  END
);
-- An EMI loan has its EMI terms and no flexible ones; a flexible loan the reverse.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_repayment" CHECK (
  CASE "repayment"
    WHEN 'EMI' THEN "tenureMonths" BETWEEN 1 AND 480 AND "emiAmount" > 0
      AND "firstEmiDate" IS NOT NULL AND "firstEmiDate" >= "disbursedOn"
      AND "interestFrequency" IS NULL AND "firstInterestDate" IS NULL AND "maturityDate" IS NULL
    ELSE "tenureMonths" IS NULL AND "emiAmount" IS NULL AND "firstEmiDate" IS NULL AND "paidBefore" = 0
      AND ("interestRatePct" = 0) = ("interestFrequency" IS NULL)
      AND ("interestFrequency" IS NULL OR "interestFrequency" = 'AT_MATURITY' OR "firstInterestDate" >= "disbursedOn")
      AND ("interestFrequency" IS DISTINCT FROM 'AT_MATURITY' OR ("maturityDate" IS NOT NULL AND "firstInterestDate" IS NULL))
  END
);
-- Each disbursal kind carries its own field and no other.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursal" CHECK (
  CASE "disbursal"
    WHEN 'BEFORE_BOOKS' THEN "openingOutstanding" > 0 AND "disbursalAccountId" IS NULL AND "assetLedgerName" IS NULL
      AND ("repayment" = 'FLEXIBLE' OR ("paidBefore" BETWEEN 0 AND "tenureMonths" - 1 AND "openingOutstanding" <= "principal"))
    WHEN 'THROUGH_BANK' THEN "disbursalAccountId" IS NOT NULL AND "assetLedgerName" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
    ELSE "assetLedgerName" IS NOT NULL AND "disbursalAccountId" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
  END
);
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_security" CHECK ("isSecured" OR "security" IS NULL);

ALTER TABLE "LoanEntry" ADD CONSTRAINT "LoanEntry_amounts" CHECK (
  "principal" >= 0 AND "interest" >= 0 AND "tds" >= 0 AND "charges" >= 0
  AND "tds" <= "interest"
  AND "principal" + "interest" + "charges" > 0
  AND ("instalmentNo" IS NULL OR "instalmentNo" >= 1)
);
-- What each entry kind carries (agent/accounts-plan.md, "Entries").
ALTER TABLE "LoanEntry" ADD CONSTRAINT "LoanEntry_kind" CHECK (
  CASE "kind"
    WHEN 'EMI' THEN "instalmentNo" IS NOT NULL AND "bankAccountId" IS NOT NULL
    WHEN 'PRINCIPAL' THEN "principal" > 0 AND "interest" = 0 AND "instalmentNo" IS NULL AND "bankAccountId" IS NOT NULL
    WHEN 'INTEREST' THEN "interest" > 0 AND "principal" = 0 AND "bankAccountId" IS NOT NULL
    WHEN 'INTEREST_ADDED' THEN "interest" > 0 AND "principal" = 0 AND "charges" = 0 AND "bankAccountId" IS NULL
    ELSE "principal" > 0 AND "interest" = 0 AND "charges" = 0 AND "instalmentNo" IS NULL AND "bankAccountId" IS NOT NULL
  END
);
