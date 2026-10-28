// One flat list of every document number the business holds (SOW 12): the
// papers attached to invoices, e-way bills recorded on vendor bills, and
// vendor bill scans. Built from the records they belong to, so there is no
// second copy to keep in step.
import { documentType } from "@/features/invoices/dispatch-documents";
import { invoiceTax, invoiceTotals, missingDocuments, needsEinvoice } from "@/features/invoices/invoice-rules";
import type { DispatchDocumentKind, Invoice } from "@/features/invoices/types";
import type { Party } from "@/features/parties/types";
import type { Bill } from "@/features/purchases/types";
import type { Shipment } from "@/features/shipments/types";

export type RegisterKind = DispatchDocumentKind | "purchase-eway" | "vendor-bill";

export interface RegisterEntry {
  kind: RegisterKind;
  name: string;
  number: string;
  date: string;
  /** What it belongs to, with a link. */
  owner: { label: string; href: string };
  party: string;
  vehicle?: string;
  shipment?: { label: string; href: string };
  fileName?: string;
}

export const REGISTER_KIND_NAMES: Record<"purchase-eway" | "vendor-bill", string> = {
  "purchase-eway": "E-way bill (purchase)",
  "vendor-bill": "Vendor bill",
};

export function buildRegister(invoices: Invoice[], bills: Bill[], shipments: Shipment[], parties: Party[]): RegisterEntry[] {
  const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;
  const shipmentOf = (invoiceId: string) => {
    const shipment = shipments.find((candidate) => candidate.invoiceIds.includes(invoiceId));
    return shipment && { label: shipment.number, href: `/shipments/${shipment.id}` };
  };

  const fromInvoices = invoices.flatMap((invoice) =>
    Object.entries(invoice.documents).map(([kind, document]): RegisterEntry => ({
      kind: kind as DispatchDocumentKind,
      name: documentType(kind as DispatchDocumentKind).name,
      number: document!.number,
      date: document!.date,
      owner: { label: invoice.number, href: `/invoices/${invoice.id}` },
      party: partyName(invoice.partyId),
      vehicle: invoice.vehicleNumber,
      shipment: shipmentOf(invoice.id),
      fileName: document!.fileName,
    })),
  );

  const fromBills = bills.flatMap((bill): RegisterEntry[] => {
    const owner = { label: bill.reference, href: `/purchases/${bill.id}` };
    const entries: RegisterEntry[] = [
      { kind: "vendor-bill", name: REGISTER_KIND_NAMES["vendor-bill"], number: bill.vendorBillNumber, date: bill.date, owner, party: partyName(bill.vendorId), fileName: bill.fileName },
    ];
    if (bill.ewayBill) {
      entries.push({
        kind: "purchase-eway",
        name: REGISTER_KIND_NAMES["purchase-eway"],
        number: bill.ewayBill.number,
        date: bill.ewayBill.date,
        owner,
        party: partyName(bill.vendorId),
        vehicle: bill.ewayBill.vehicleNumber,
      });
    }
    return entries;
  });

  return [...fromInvoices, ...fromBills].sort((a, b) => b.date.localeCompare(a.date));
}

/** Required papers not yet attached, on issued invoices. */
export function missingRegister(invoices: Invoice[], parties: Party[], companyState: string) {
  return invoices
    .filter((invoice) => invoice.status === "issued")
    .flatMap((invoice) => {
      const party = parties.find((candidate) => candidate.id === invoice.partyId)!;
      const totals = invoiceTotals(invoice.lines, invoiceTax(companyState, invoice, party).regime);
      return missingDocuments(invoice, totals.grandTotal, needsEinvoice(invoice, party)).map((kind) => ({
        invoice,
        party: party.displayName,
        kind,
        name: documentType(kind).name,
      }));
    });
}
