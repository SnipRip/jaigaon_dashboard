// Invoice arithmetic and status. No React: the backend will port these when
// invoices are saved for real.
//
// Taxable value = quantity × rate less discount. GST per line follows the
// regime from gst-rules.ts; totals round to the rupee with a round-off line.
import { saleTax, taxComponents, type Regime, type TaxComponent, type TaxDecision } from "@/features/gst/gst-rules";
import type { Party } from "@/features/parties/types";
import { documentsFor } from "./dispatch-documents";
import type { DispatchDocumentKind, Invoice, InvoiceKind, InvoiceLine } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

/**
 * The tax regime of an invoice. A local invoice uses its own place of supply
 * (it can differ from the party's, e.g. delivery to another state); an export
 * invoice uses its route, LUT or IGST.
 */
export function invoiceTax(
  companyState: string,
  invoice: Pick<Invoice, "kind" | "placeOfSupply" | "exportRoute">,
  party: Pick<Party, "treatment">,
): TaxDecision {
  if (invoice.kind === "export") {
    return saleTax(companyState, { treatment: party.treatment === "sez" ? "sez" : "overseas", exportRoute: invoice.exportRoute });
  }
  return saleTax(companyState, { treatment: party.treatment, stateCode: invoice.placeOfSupply });
}

export interface LineTotals {
  taxable: number;
  taxes: (TaxComponent & { amount: number })[];
  total: number;
}

export function lineTotals(line: InvoiceLine, regime: Regime): LineTotals {
  const taxable = money(line.quantity * line.rate * (1 - line.discountPct / 100));
  const taxes = taxComponents(line.gstRatePct, regime).map((component) => ({
    ...component,
    amount: money((taxable * component.ratePct) / 100),
  }));
  return { taxable, taxes, total: money(taxable + taxes.reduce((sum, tax) => sum + tax.amount, 0)) };
}

export interface InvoiceTotals {
  taxable: number;
  /** Summed by tax name: CGST, SGST, IGST. */
  taxByName: Partial<Record<TaxComponent["name"], number>>;
  tax: number;
  roundOff: number;
  grandTotal: number;
}

export function invoiceTotals(lines: InvoiceLine[], regime: Regime): InvoiceTotals {
  const taxByName: InvoiceTotals["taxByName"] = {};
  let taxable = 0;
  for (const line of lines) {
    const totals = lineTotals(line, regime);
    taxable += totals.taxable;
    for (const tax of totals.taxes) taxByName[tax.name] = money((taxByName[tax.name] ?? 0) + tax.amount);
  }
  const tax = money(Object.values(taxByName).reduce((sum, amount) => sum + (amount ?? 0), 0));
  const exact = money(taxable + tax);
  const grandTotal = Math.round(exact);
  return { taxable: money(taxable), taxByName, tax, roundOff: money(grandTotal - exact), grandTotal };
}

/** HSN-wise summary printed under the lines. */
export function hsnSummary(lines: InvoiceLine[], regime: Regime) {
  const rows = new Map<string, { hsn: string; ratePct: number; taxable: number; tax: number }>();
  for (const line of lines) {
    const totals = lineTotals(line, regime);
    const key = `${line.hsn}-${line.gstRatePct}`;
    const row = rows.get(key) ?? { hsn: line.hsn, ratePct: line.gstRatePct, taxable: 0, tax: 0 };
    row.taxable = money(row.taxable + totals.taxable);
    row.tax = money(row.tax + totals.taxes.reduce((sum, tax) => sum + tax.amount, 0));
    rows.set(key, row);
  }
  return [...rows.values()];
}

/** Separate series per kind and financial year: INV/2627/0007, EXP/2627/0003. */
export function invoiceNumber(kind: InvoiceKind, financialYear: string, sequence: number) {
  const year = financialYear.replace("-", "").slice(2);
  return `${kind === "export" ? "EXP" : "INV"}/${year}/${String(sequence).padStart(4, "0")}`;
}

/** West Bengal's e-way bill limit for movement inside the state, and the all-India limit. */
export const EWAY_BILL_LIMIT = 50000;

/**
 * E-invoicing applies (turnover above ₹5 crore, confirmed 28 Oct 2026) to
 * B2B invoices and exports. Sales to consumers and unregistered buyers (B2C)
 * do not get an IRN.
 */
export const needsEinvoice = (invoice: Pick<Invoice, "kind">, party: Pick<Party, "treatment">) =>
  invoice.kind === "export" || party.treatment === "registered" || party.treatment === "composition" || party.treatment === "sez";

/** Is this document required on this invoice? The e-way bill only above the limit. */
export function isDocumentRequired(kind: DispatchDocumentKind, invoice: Pick<Invoice, "kind">, grandTotal: number, einvoice: boolean) {
  if (kind === "e-invoice") return einvoice;
  if (kind === "eway-bill") return grandTotal > EWAY_BILL_LIMIT;
  return invoice.kind === "export";
}

/** Required documents still to attach. */
export function missingDocuments(invoice: Invoice, grandTotal: number, einvoice: boolean): DispatchDocumentKind[] {
  return documentsFor(invoice.kind)
    .map((type) => type.kind)
    .filter((kind) => !invoice.documents[kind] && isDocumentRequired(kind, invoice, grandTotal, einvoice));
}

export type InvoiceStage = "Draft" | "Issued" | "Dispatched" | "Cleared customs" | "Payment realised" | "Cancelled";

/** Where the invoice is in its life, from the documents attached so far. */
export function invoiceStage(invoice: Invoice): InvoiceStage {
  if (invoice.status === "cancelled") return "Cancelled";
  if (invoice.status === "draft") return "Draft";
  const has = (kind: DispatchDocumentKind) => Boolean(invoice.documents[kind]);
  if (invoice.kind === "export") {
    if (has("brc")) return "Payment realised";
    if (has("leo") || has("shipping-bill")) return "Cleared customs";
  }
  if (has("lorry-challan") || has("eway-bill")) return "Dispatched";
  return "Issued";
}

/** The printed declaration an export invoice must carry (CGST rule 46). */
export function exportDeclaration(invoice: Pick<Invoice, "exportRoute" | "lutArn">) {
  return invoice.exportRoute === "igst"
    ? "SUPPLY MEANT FOR EXPORT ON PAYMENT OF INTEGRATED TAX"
    : `SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX${invoice.lutArn ? ` · LUT ARN ${invoice.lutArn}` : ""}`;
}

/**
 * The date export proceeds should be in by: 15 months from the invoice, 18
 * when invoiced in rupees (FEMA export regulations from 1 Oct 2026, as one
 * source reads them). To be confirmed with the AD bank.
 */
export function realisationDueDate(invoice: Pick<Invoice, "date" | "currency">) {
  const months = invoice.currency === "INR" ? 18 : 15;
  const [year, month, day] = invoice.date.split("-").map(Number);
  const due = new Date(Date.UTC(year, month - 1 + months, day));
  return due.toISOString().slice(0, 10);
}
