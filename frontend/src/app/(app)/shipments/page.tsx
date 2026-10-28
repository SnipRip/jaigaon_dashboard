import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import { shipments } from "@/features/shipments/sample-data";
import { ShipmentsWorkspace } from "@/features/shipments/shipments-workspace";

export const metadata: Metadata = { title: "Shipments" };

const customers = Object.fromEntries(parties.map((party) => [party.id, party.displayName]));

export default function ShipmentsPage() {
  return (
    <>
      <SampleDataNotice />
      <ShipmentsWorkspace shipments={shipments} invoices={invoices} customers={customers} />
    </>
  );
}
