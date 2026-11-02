-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "stateCode" TEXT NOT NULL,
    "iec" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "district" TEXT,
    "pin" TEXT,
    "phone" TEXT,
    "altPhone" TEXT,
    "email" TEXT,
    "exportBank" TEXT,
    "customsStation" TEXT,
    "portCode" TEXT,
    "defaultExportRoute" "ExportRoute" NOT NULL DEFAULT 'LUT',
    "exportCurrency" "PartyCurrency" NOT NULL DEFAULT 'INR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- One row only.
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_single_row" CHECK ("id" = 1);

-- The facts the brochure gives, and the border port the client confirmed
-- (28 Oct 2026). GSTIN, PAN and IEC are still to come from the client.
INSERT INTO "CompanyProfile" ("id", "legalName", "stateCode", "addressLine", "city", "district", "pin", "phone", "altPhone", "email", "customsStation", "portCode", "updatedAt")
VALUES (1, 'Jaigaon Quality Enterprise', '19', 'M.G. Road', 'Jaigaon', 'Alipurduar', '736182', '+919635312988', '+97577667493', 'jaigaonquality.ent@gmail.com', 'Jaigaon Land Customs Station', 'INJIGB', CURRENT_TIMESTAMP);
