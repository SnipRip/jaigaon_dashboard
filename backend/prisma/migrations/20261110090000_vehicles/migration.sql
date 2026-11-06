-- Vehicle master (masters-plan.md row 9) and the vehicle a shipment picked.

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRUCK_10', 'TRUCK_6', 'TRAILER', 'PICKUP');

-- CreateEnum
CREATE TYPE "VehicleOwnership" AS ENUM ('OWN', 'HIRED');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "vehicleId" UUID;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "capacityTons" DECIMAL(6,1),
    "ownership" "VehicleOwnership" NOT NULL,
    "transporterId" UUID,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_number_key" ON "Vehicle"("number");

-- CreateIndex
CREATE INDEX "Vehicle_transporterId_idx" ON "Vehicle"("transporterId");

-- CreateIndex
CREATE INDEX "Shipment_vehicleId_idx" ON "Shipment"("vehicleId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs (the service checks the same, with readable messages)
ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_number_check" CHECK ("number" ~ '^[A-Z]{2}-?[0-9]{1,2}-?[A-Z]{0,3}-?[0-9]{4}$'),
  ADD CONSTRAINT "Vehicle_transporter_check" CHECK ("ownership" = 'HIRED' OR "transporterId" IS NULL),
  ADD CONSTRAINT "Vehicle_capacity_check" CHECK ("capacityTons" IS NULL OR "capacityTons" > 0);
