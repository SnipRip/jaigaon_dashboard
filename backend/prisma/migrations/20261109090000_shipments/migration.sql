-- Shipments (SOW 10): a truck to Bhutan carrying one buyer's export
-- invoices, its stages with dates, and the expenses spent on it. Expenses
-- saved with allocation SHIPMENT before shipments were stored have no
-- shipment yet and are linked from the shipment page. The service checks
-- everything under row locks; the CHECKs keep the basics true whatever writes.
-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('PLANNED', 'LOADING', 'IN_TRANSIT', 'AT_BORDER', 'CLEARED', 'DELIVERED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "shipmentId" UUID;

-- CreateTable
CREATE TABLE "Shipment" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "issuedNumberId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "partyId" UUID NOT NULL,
    "stage" "ShipmentStage" NOT NULL DEFAULT 'PLANNED',
    "vehicleNumber" TEXT NOT NULL,
    "transporterId" UUID,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "destination" TEXT NOT NULL,
    "borderPoint" TEXT NOT NULL,
    "customsAgent" TEXT,
    "sealNumber" TEXT,
    "packages" INTEGER,
    "grossWeightKg" DECIMAL(12,3),
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentInvoice" (
    "shipmentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "released" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShipmentInvoice_pkey" PRIMARY KEY ("shipmentId","invoiceId")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "stage" "ShipmentStage" NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "byId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_issuedNumberId_key" ON "Shipment"("issuedNumberId");

-- CreateIndex
CREATE INDEX "Shipment_number_idx" ON "Shipment"("number");

-- CreateIndex
CREATE INDEX "Shipment_date_idx" ON "Shipment"("date");

-- CreateIndex
CREATE INDEX "Shipment_partyId_date_idx" ON "Shipment"("partyId", "date");

-- CreateIndex
CREATE INDEX "ShipmentInvoice_invoiceId_idx" ON "ShipmentInvoice"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentEvent_shipmentId_stage_key" ON "ShipmentEvent"("shipmentId", "stage");

-- CreateIndex
CREATE INDEX "Expense_shipmentId_idx" ON "Expense"("shipmentId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentInvoice" ADD CONSTRAINT "ShipmentInvoice_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentInvoice" ADD CONSTRAINT "ShipmentInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- CHECKs
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_cancel_check" CHECK (("cancelledAt" IS NULL) = ("cancelReason" IS NULL)),
  ADD CONSTRAINT "Shipment_packages_check" CHECK ("packages" IS NULL OR "packages" > 0),
  ADD CONSTRAINT "Shipment_weight_check" CHECK ("grossWeightKg" IS NULL OR "grossWeightKg" > 0),
  ADD CONSTRAINT "Shipment_vehicle_check" CHECK ("vehicleNumber" ~ '^[A-Z0-9-]{4,15}$');

-- An invoice rides on one live shipment at a time.
CREATE UNIQUE INDEX "ShipmentInvoice_live_invoice_key" ON "ShipmentInvoice"("invoiceId") WHERE NOT "released";

-- Only a shipment expense names a shipment (or none until linked).
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_allocation_check";
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_allocation_check" CHECK (
    ("allocation" = 'ITEM_COST' AND "billId" IS NOT NULL AND "invoiceId" IS NULL AND "shipmentId" IS NULL)
    OR ("allocation" = 'INVOICE' AND "invoiceId" IS NOT NULL AND "billId" IS NULL AND "shipmentId" IS NULL)
    OR ("allocation" = 'SHIPMENT' AND "billId" IS NULL AND "invoiceId" IS NULL)
    OR ("allocation" = 'OVERHEAD' AND "billId" IS NULL AND "invoiceId" IS NULL AND "shipmentId" IS NULL));
