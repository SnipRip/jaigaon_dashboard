-- CreateEnum
CREATE TYPE "BankCashKind" AS ENUM ('BANK', 'OVERDRAFT', 'CASH');

-- CreateTable
CREATE TABLE "BankCashAccount" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BankCashKind" NOT NULL,
    "bankName" TEXT,
    "branch" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upiId" TEXT,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingDate" DATE NOT NULL,
    "showOnInvoice" BOOLEAN NOT NULL DEFAULT false,
    "tallyLedgerName" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankCashAccount_name_key" ON "BankCashAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BankCashAccount_tallyLedgerName_key" ON "BankCashAccount"("tallyLedgerName");

-- CreateIndex
CREATE UNIQUE INDEX "BankCashAccount_ifsc_accountNumber_key" ON "BankCashAccount"("ifsc", "accountNumber");

-- The service checks these too (bank-cash-rules.ts); the database keeps them true.
-- A cash account has no bank fields and never prints on invoices; a bank or
-- overdraft account has its bank name, account number and IFSC.
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_bank_fields" CHECK (
  CASE WHEN "kind" = 'CASH'
    THEN "bankName" IS NULL AND "branch" IS NULL AND "accountNumber" IS NULL
      AND "ifsc" IS NULL AND "upiId" IS NULL AND NOT "showOnInvoice"
    ELSE "bankName" IS NOT NULL AND "accountNumber" IS NOT NULL AND "ifsc" IS NOT NULL
  END
);
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_ifsc" CHECK ("ifsc" ~ '^[A-Z]{4}0[A-Z0-9]{6}$');
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_account_number" CHECK ("accountNumber" ~ '^[0-9]{9,18}$');
-- Only an overdraft or cash credit account may open below zero.
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_opening_balance" CHECK ("openingBalance" >= 0 OR "kind" = 'OVERDRAFT');
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_archived_not_on_invoice" CHECK (NOT ("isArchived" AND "showOnInvoice"));
