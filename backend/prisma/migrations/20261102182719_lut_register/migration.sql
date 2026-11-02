-- CreateTable
CREATE TABLE "Lut" (
    "id" UUID NOT NULL,
    "financialYear" TEXT NOT NULL,
    "arn" TEXT NOT NULL,
    "adCode" TEXT,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lut_financialYear_key" ON "Lut"("financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "Lut_arn_key" ON "Lut"("arn");

-- The service checks this too (lut-rules.ts); the database keeps it true.
ALTER TABLE "Lut" ADD CONSTRAINT "Lut_dates" CHECK ("validTo" >= "validFrom");
