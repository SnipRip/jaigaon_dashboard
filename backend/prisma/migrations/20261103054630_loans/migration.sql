-- CreateEnum
CREATE TYPE "LoanKind" AS ENUM ('VEHICLE', 'EQUIPMENT', 'PROPERTY', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanDisbursal" AS ENUM ('BEFORE_BOOKS', 'INTO_BANK', 'PAID_TO_SELLER');

-- CreateTable
CREATE TABLE "Loan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LoanKind" NOT NULL,
    "lenderName" TEXT NOT NULL,
    "loanAccountNumber" TEXT,
    "isSecured" BOOLEAN NOT NULL,
    "security" TEXT,
    "principal" DECIMAL(14,2) NOT NULL,
    "interestRatePct" DECIMAL(5,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(14,2) NOT NULL,
    "disbursedOn" DATE NOT NULL,
    "firstEmiDate" DATE NOT NULL,
    "disbursal" "LoanDisbursal" NOT NULL,
    "disbursedIntoId" UUID,
    "assetLedgerName" TEXT,
    "paidBefore" INTEGER NOT NULL DEFAULT 0,
    "openingOutstanding" DECIMAL(14,2),
    "repaymentAccountId" UUID NOT NULL,
    "interestLedgerName" TEXT,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "instalmentNo" INTEGER,
    "paidOn" DATE NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL,
    "charges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankAccountId" UUID NOT NULL,
    "reference" TEXT,
    "voucherNumber" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Loan_name_key" ON "Loan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_issuedNumberId_key" ON "LoanPayment"("issuedNumberId");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_paidOn_idx" ON "LoanPayment"("loanId", "paidOn");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursedIntoId_fkey" FOREIGN KEY ("disbursedIntoId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_repaymentAccountId_fkey" FOREIGN KEY ("repaymentAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The service checks these too (loan-rules.ts); the database keeps them true.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_amounts" CHECK (
  "principal" > 0 AND "emiAmount" > 0
  AND "interestRatePct" >= 0 AND "interestRatePct" <= 50
  AND "tenureMonths" BETWEEN 1 AND 480
  AND "reminderDays" BETWEEN 0 AND 30
  AND "firstEmiDate" >= "disbursedOn"
);
-- Each disbursal kind carries its own field and no other.
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_disbursal" CHECK (
  CASE "disbursal"
    WHEN 'BEFORE_BOOKS' THEN "openingOutstanding" IS NOT NULL AND "disbursedIntoId" IS NULL AND "assetLedgerName" IS NULL
      AND "paidBefore" BETWEEN 0 AND "tenureMonths" - 1
      AND "openingOutstanding" > 0 AND "openingOutstanding" <= "principal"
    WHEN 'INTO_BANK' THEN "disbursedIntoId" IS NOT NULL AND "assetLedgerName" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
    ELSE "assetLedgerName" IS NOT NULL AND "disbursedIntoId" IS NULL
      AND "paidBefore" = 0 AND "openingOutstanding" IS NULL
  END
);
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_security" CHECK ("isSecured" OR "security" IS NULL);

ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_amounts" CHECK (
  "principal" >= 0 AND "interest" >= 0 AND "charges" >= 0
  AND "principal" + "interest" + "charges" > 0
  AND ("instalmentNo" IS NULL OR "instalmentNo" >= 1)
);
-- A prepayment is principal only.
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_prepayment" CHECK ("instalmentNo" IS NOT NULL OR ("interest" = 0 AND "principal" > 0));
