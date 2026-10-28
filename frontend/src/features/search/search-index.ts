// Everything global search can find (SOW 17): items, parties, quotations,
// invoices, bills, shipments, document numbers and vehicles. Built on the
// server from the sample records and handed to the top bar; becomes one
// backend search endpoint later.
import { buildRegister } from "@/features/documents/document-register";
import { invoices } from "@/features/invoices/sample-data";
import { items } from "@/features/items/sample-data";
import { vehicles } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { bills } from "@/features/purchases/sample-data";
import { quotationLabel } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";
import { shipments } from "@/features/shipments/sample-data";
import type { SearchEntry } from "./search-match";

const entry = (kind: string, title: string, detail: string, href: string, ...extra: (string | undefined)[]): SearchEntry => ({
  kind,
  title,
  detail,
  href,
  terms: [kind, title, detail, ...extra].filter(Boolean).join(" ").toLowerCase(),
});

const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;

export function buildSearchIndex(): SearchEntry[] {
  return [
    ...items.map((item) => entry("Item", item.name, `${item.sku} · ${item.stock} in stock`, `/items/${item.id}`, item.brand)),
    ...parties.map((party) =>
      entry(party.roles.includes("customer") ? "Customer" : "Vendor", party.displayName, [party.billing.city, party.gstin].filter(Boolean).join(" · "), `/${party.roles.includes("customer") ? "customers" : "vendors"}/${party.id}`, party.phone, party.legalName),
    ),
    ...quotations.map((quotation) => entry("Quotation", quotationLabel(quotation), partyName(quotation.partyId), `/quotations/${quotation.id}`)),
    ...invoices.map((invoice) => entry("Invoice", invoice.number, partyName(invoice.partyId), `/invoices/${invoice.id}`, invoice.vehicleNumber)),
    ...bills.map((bill) => entry("Bill", bill.reference, `${partyName(bill.vendorId)} · ${bill.vendorBillNumber}`, `/purchases/${bill.id}`, bill.ewayBill?.number)),
    ...shipments.map((shipment) => entry("Shipment", shipment.number, `${shipment.vehicleNumber} to ${shipment.destination}`, `/shipments/${shipment.id}`, shipment.vehicleNumber, shipment.sealNumber)),
    ...buildRegister(invoices, bills, shipments, parties)
      .filter((document) => document.kind !== "vendor-bill" && document.kind !== "e-invoice")
      .map((document) => entry(document.name, document.number, `${document.owner.label} · ${document.party}`, document.owner.href, document.vehicle)),
    ...vehicles.map((vehicle) => entry("Vehicle", vehicle.number, vehicle.driverName ?? "", "/masters/vehicles")),
  ];
}
