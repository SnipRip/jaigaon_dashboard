// Shipment stages and the papers each stage needs. No React.
import type { DispatchDocumentKind, Invoice } from "@/features/invoices/types";
import type { Shipment, ShipmentStatus } from "./types";

export const SHIPMENT_STAGES: { status: ShipmentStatus; label: string; hint: string }[] = [
  { status: "planned", label: "Planned", hint: "Invoices picked, truck booked" },
  { status: "loading", label: "Loading", hint: "Goods going on the truck at our yard" },
  { status: "in-transit", label: "On the way", hint: "Left the yard with challan and e-way bill" },
  { status: "at-border", label: "At the border", hint: "At Jaigaon LCS, shipping bill filed by the agent" },
  { status: "cleared", label: "Customs cleared", hint: "LEO given, crossed into Phuentsholing" },
  { status: "delivered", label: "Delivered", hint: "Unloaded at the buyer's site" },
];

export const stageLabel = (status: ShipmentStatus) => SHIPMENT_STAGES.find((stage) => stage.status === status)?.label ?? status;

export const stageIndex = (status: ShipmentStatus) => SHIPMENT_STAGES.findIndex((stage) => stage.status === status);

/** The next stage, or undefined once delivered. */
export const nextStage = (status: ShipmentStatus) => SHIPMENT_STAGES[stageIndex(status) + 1]?.status;

/** Papers a truck needs before it may reach each stage. */
const NEEDED_BY: Partial<Record<ShipmentStatus, DispatchDocumentKind[]>> = {
  "in-transit": ["lorry-challan", "eway-bill"],
  "at-border": ["customs-invoice", "packing-list", "shipping-bill"],
  cleared: ["leo"],
};

/** Papers missing on any invoice of the shipment for it to move to `status`. */
export function missingFor(status: ShipmentStatus, invoices: Invoice[]): { invoice: Invoice; kind: DispatchDocumentKind }[] {
  const needed = SHIPMENT_STAGES.slice(0, stageIndex(status) + 1).flatMap((stage) => NEEDED_BY[stage.status] ?? []);
  return invoices.flatMap((invoice) => needed.filter((kind) => !invoice.documents[kind]).map((kind) => ({ invoice, kind })));
}

export const shipmentNumber = (financialYear: string, sequence: number) =>
  `SHP/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;

/** Export invoices not yet on any shipment, which a new shipment can carry. */
export const unshippedInvoices = (invoices: Invoice[], shipments: Shipment[]) =>
  invoices.filter((invoice) => invoice.kind === "export" && invoice.status !== "cancelled" && !shipments.some((shipment) => shipment.invoiceIds.includes(invoice.id)));
