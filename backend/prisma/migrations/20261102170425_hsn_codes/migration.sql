-- CreateEnum
CREATE TYPE "CodeKind" AS ENUM ('HSN', 'SAC');

-- CreateTable
CREATE TABLE "HsnCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CodeKind" NOT NULL,
    "description" TEXT NOT NULL,
    "cessPct" DECIMAL(5,2),
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HsnCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsnRate" (
    "id" UUID NOT NULL,
    "hsnCodeId" UUID NOT NULL,
    "ratePct" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,

    CONSTRAINT "HsnRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HsnCode_code_key" ON "HsnCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HsnRate_hsnCodeId_effectiveFrom_key" ON "HsnRate"("hsnCodeId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "HsnRate" ADD CONSTRAINT "HsnRate_hsnCodeId_fkey" FOREIGN KEY ("hsnCodeId") REFERENCES "HsnCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
