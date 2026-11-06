-- CreateTable
CREATE TABLE "SalesSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "invoiceInStockOnly" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesSettings_pkey" PRIMARY KEY ("id")
);

-- One row only.
ALTER TABLE "SalesSettings" ADD CONSTRAINT "SalesSettings_single_row" CHECK ("id" = 1);

-- The row, with every setting off.
INSERT INTO "SalesSettings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
