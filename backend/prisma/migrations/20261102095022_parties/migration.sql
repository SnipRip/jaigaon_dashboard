-- CreateEnum
CREATE TYPE "PartyKind" AS ENUM ('BUSINESS', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "GstTreatment" AS ENUM ('REGISTERED', 'COMPOSITION', 'UNREGISTERED', 'CONSUMER', 'OVERSEAS', 'SEZ');

-- CreateEnum
CREATE TYPE "ExportRoute" AS ENUM ('LUT', 'IGST');

-- CreateEnum
CREATE TYPE "PartyCurrency" AS ENUM ('INR', 'BTN');

-- CreateEnum
CREATE TYPE "BalanceSide" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateTable
CREATE TABLE "Party" (
    "id" UUID NOT NULL,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isVendor" BOOLEAN NOT NULL DEFAULT false,
    "kind" "PartyKind" NOT NULL DEFAULT 'BUSINESS',
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "treatment" "GstTreatment" NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "placeOfSupply" TEXT,
    "country" TEXT,
    "foreignTaxId" TEXT,
    "currency" "PartyCurrency" NOT NULL DEFAULT 'INR',
    "exportRoute" "ExportRoute",
    "isGta" BOOLEAN NOT NULL DEFAULT false,
    "addressLine" TEXT,
    "city" TEXT,
    "pin" TEXT,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(14,2),
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingBalanceSide" "BalanceSide" NOT NULL DEFAULT 'RECEIVABLE',
    "udyamNumber" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "ifsc" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_gstin_key" ON "Party"("gstin");

-- CreateIndex
CREATE INDEX "Party_isCustomer_idx" ON "Party"("isCustomer");

-- CreateIndex
CREATE INDEX "Party_isVendor_idx" ON "Party"("isVendor");
