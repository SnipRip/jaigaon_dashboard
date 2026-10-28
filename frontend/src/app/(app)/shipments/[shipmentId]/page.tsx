import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { expensesFor } from "@/features/expenses/expense-rules";
import { expenses } from "@/features/expenses/sample-data";
import { invoices } from "@/features/invoices/sample-data";
import { items } from "@/features/items/sample-data";
import { expenseHeads, transporters } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { shipmentProfit } from "@/features/profit/profit-rules";
import { shipments } from "@/features/shipments/sample-data";
import { ShipmentDetail } from "@/features/shipments/shipment-detail";

type ShipmentParams = PageProps<"/shipments/[shipmentId]">["params"];

const findShipment = (id: string) => shipments.find((shipment) => shipment.id === id);

export function generateStaticParams() {
  return shipments.map((shipment) => ({ shipmentId: shipment.id }));
}

export async function generateMetadata({ params }: { params: ShipmentParams }): Promise<Metadata> {
  return { title: findShipment((await params).shipmentId)?.number ?? "Shipment" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function ShipmentPage({ params }: { params: ShipmentParams }) {
  return (
    <Suspense>
      <ShipmentView params={params} />
    </Suspense>
  );
}

async function ShipmentView({ params }: { params: ShipmentParams }) {
  const shipment = findShipment((await params).shipmentId);
  if (!shipment) notFound();
  const carried = invoices.filter((invoice) => shipment.invoiceIds.includes(invoice.id));

  return (
    <>
      <SampleDataNotice />
      <ShipmentDetail
        initialShipment={shipment}
        invoices={carried}
        customerName={parties.find((party) => party.id === shipment.customerId)?.displayName ?? shipment.customerId}
        transporterName={transporters.find((transporter) => transporter.id === shipment.transporterId)?.name}
        expenses={expensesFor(expenses, "shipment", shipment.id)}
        expenseHeadNames={Object.fromEntries(expenseHeads.map((head) => [head.id, head.name]))}
        profit={shipmentProfit(shipment.id, carried, items, expenses)}
      />
    </>
  );
}
