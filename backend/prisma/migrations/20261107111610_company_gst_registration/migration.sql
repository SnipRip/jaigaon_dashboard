-- CreateEnum
CREATE TYPE "GstRegistration" AS ENUM ('REGULAR', 'COMPOSITION', 'UNREGISTERED');

-- AlterEnum
ALTER TYPE "SaleRegime" ADD VALUE 'BILL_OF_SUPPLY';

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "registration" "GstRegistration" NOT NULL DEFAULT 'REGULAR';
