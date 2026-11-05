-- CreateEnum
CREATE TYPE "SchemeLevel" AS ENUM ('LINE', 'ORDER');

-- CreateEnum
CREATE TYPE "SchemeBenefit" AS ENUM ('PERCENT', 'AMOUNT_PER_UNIT', 'FLAT_AMOUNT', 'FREE_QUANTITY');

-- CreateEnum
CREATE TYPE "SchemePartyScope" AS ENUM ('ALL', 'INDIA', 'OVERSEAS', 'SELECTED');

-- CreateEnum
CREATE TYPE "SchemeRateSource" AS ENUM ('SHEET', 'SPECIAL', 'MANUAL');

-- CreateTable
CREATE TABLE "Scheme" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" "SchemeLevel" NOT NULL,
    "benefit" "SchemeBenefit" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "buyQuantity" DECIMAL(14,3),
    "maxDiscount" DECIMAL(12,2),
    "minQuantity" DECIMAL(14,3),
    "minValue" DECIMAL(14,2),
    "partyScope" "SchemePartyScope" NOT NULL DEFAULT 'ALL',
    "rateSources" "SchemeRateSource"[],
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" DATE NOT NULL,
    "validTill" DATE,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeTarget" (
    "id" UUID NOT NULL,
    "schemeId" UUID NOT NULL,
    "itemId" UUID,
    "categoryId" UUID,
    "brandId" UUID,

    CONSTRAINT "SchemeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeParty" (
    "schemeId" UUID NOT NULL,
    "partyId" UUID NOT NULL,

    CONSTRAINT "SchemeParty_pkey" PRIMARY KEY ("schemeId","partyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_name_key" ON "Scheme"("name");

-- CreateIndex
CREATE INDEX "Scheme_isArchived_validFrom_idx" ON "Scheme"("isArchived", "validFrom");

-- CreateIndex
CREATE INDEX "SchemeTarget_schemeId_idx" ON "SchemeTarget"("schemeId");

-- CreateIndex
CREATE INDEX "SchemeParty_partyId_idx" ON "SchemeParty"("partyId");

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeParty" ADD CONSTRAINT "SchemeParty_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeParty" ADD CONSTRAINT "SchemeParty_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The same rules src/schemes/scheme-rules.ts checks before a save.
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_value_check" CHECK ("value" > 0);
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_percent_check"
  CHECK ("benefit" <> 'PERCENT' OR "value" < 100);
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_level_benefit_check"
  CHECK ("level" = 'LINE' OR "benefit" IN ('PERCENT', 'FLAT_AMOUNT'));
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_free_quantity_check"
  CHECK (("benefit" = 'FREE_QUANTITY') = ("buyQuantity" IS NOT NULL) AND ("buyQuantity" IS NULL OR "buyQuantity" > 0));
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_limits_check"
  CHECK (("maxDiscount" IS NULL OR "maxDiscount" > 0) AND ("minQuantity" IS NULL OR "minQuantity" > 0) AND ("minValue" IS NULL OR "minValue" > 0));
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_min_quantity_line_check"
  CHECK ("level" = 'LINE' OR "minQuantity" IS NULL);
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_rate_sources_check"
  CHECK (cardinality("rateSources") >= 1);
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_dates_check"
  CHECK ("validTill" IS NULL OR "validTill" >= "validFrom");
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_one_check"
  CHECK (num_nonnulls("itemId", "categoryId", "brandId") = 1);
