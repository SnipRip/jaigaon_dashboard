-- Invoices and stock transfers may pick their vehicle from the vehicle master,
-- as shipments do. The typed vehicleNumber stays for a truck not on the list.
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "vehicleId" UUID;

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN     "vehicleId" UUID;

-- CreateIndex
CREATE INDEX "Invoice_vehicleId_idx" ON "Invoice"("vehicleId");

-- CreateIndex
CREATE INDEX "StockTransfer_vehicleId_idx" ON "StockTransfer"("vehicleId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

