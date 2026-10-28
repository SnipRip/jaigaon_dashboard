import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { invoices } from "@/features/invoices/sample-data";
import { transporters, vehicles } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { ShipmentForm } from "@/features/shipments/shipment-form";
import { shipmentNumber, unshippedInvoices } from "@/features/shipments/shipment-rules";
import { nextShipmentSequence, shipments } from "@/features/shipments/sample-data";
import { exportSettings } from "@/features/tax-export/sample-data";

export const metadata: Metadata = { title: "New shipment" };

const customers = Object.fromEntries(parties.map((party) => [party.id, party.displayName]));

export default function NewShipmentPage() {
  return (
    <>
      <SampleDataNotice />
      <ShipmentForm
        invoices={unshippedInvoices(invoices, shipments)}
        customers={customers}
        vehicles={vehicles.filter((vehicle) => !vehicle.archived)}
        transporters={transporters.filter((transporter) => !transporter.archived)}
        defaultBorderPoint={exportSettings.customsStation}
        suggestedNumber={shipmentNumber("2026-27", nextShipmentSequence)}
      />
    </>
  );
}
