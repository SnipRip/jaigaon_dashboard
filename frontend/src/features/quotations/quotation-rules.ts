// Quotation status, totals and profit. No React. GST follows the customer
// exactly as on an invoice (gst-rules.ts); profit is on the value before GST.
import { saleTax, taxComponents, type Regime, type TaxComponent } from "@/features/gst/gst-rules";
import { invoiceTotals, type InvoiceTotals } from "@/features/invoices/invoice-rules";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { lineCost, lineSales, profitOf } from "@/features/profit/profit-rules";
import type { Quotation, QuotationStatus } from "./types";
import type { OurRegistration } from "@/types/company";

export type QuotationStage = "Draft" | "Sent" | "Expired" | "Accepted" | "Rejected" | "Cancelled" | "Converted";

/** A sent quotation past its validity reads as expired; only the browser knows today. */
export function quotationStage(quotation: Pick<Quotation, "status" | "validUntil">, today: string | null): QuotationStage {
  const map: Record<QuotationStatus, QuotationStage> = { draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", cancelled: "Cancelled", converted: "Converted" };
  if (quotation.status === "sent" && today && today > quotation.validUntil) return "Expired";
  return map[quotation.status];
}

export const quotationTax = (company: OurRegistration, party: Party) =>
  saleTax(company, { treatment: party.treatment, stateCode: party.placeOfSupply, exportRoute: party.exportRoute });

const money = (value: number) => Math.round(value * 100) / 100;

/** Totals from each line's value after schemes, with GST split by the sale's regime. */
export function previewTotals(rows: { taxable: number; gstRatePct: number }[], regime: Regime): InvoiceTotals {
  const taxByName: InvoiceTotals["taxByName"] = {};
  let taxable = 0;
  for (const row of rows) {
    taxable += row.taxable;
    for (const component of taxComponents(row.gstRatePct, regime)) {
      taxByName[component.name] = money((taxByName[component.name] ?? 0) + (row.taxable * component.ratePct) / 100);
    }
  }
  const tax = money(Object.values(taxByName).reduce((sum, amount) => sum + (amount ?? 0), 0));
  const exact = money(taxable + tax);
  const grandTotal = Math.round(exact);
  return { taxable: money(taxable), taxByName, tax, roundOff: money(grandTotal - exact), grandTotal };
}

/** A saved quotation's totals, as the backend worked them out. */
function storedTotals(stored: NonNullable<Quotation["stored"]>): InvoiceTotals {
  const taxByName: Partial<Record<TaxComponent["name"], number>> = {};
  if (stored.totals.cgst) taxByName.CGST = stored.totals.cgst;
  if (stored.totals.sgst) taxByName.SGST = stored.totals.sgst;
  if (stored.totals.igst) taxByName.IGST = stored.totals.igst;
  return { taxable: stored.totals.taxable, taxByName, tax: stored.totals.tax, roundOff: stored.totals.roundOff, grandTotal: stored.totals.total };
}

export function quotationFigures(quotation: Pick<Quotation, "lines" | "stored">, party: Party, company: OurRegistration, items: Item[]) {
  const tax = quotationTax(company, party);
  if (quotation.stored) {
    // Saved figures: schemes and the cost at the time of quoting included.
    return {
      tax,
      totals: storedTotals(quotation.stored),
      profit: profitOf(quotation.stored.totals.taxable, quotation.stored.totals.cost, 0),
      // An item with no stock had no cost to count: its margin is unknown, not 100%.
      costKnown: quotation.stored.lines.every((line) => line.costAtQuote !== null),
    };
  }
  const totals = invoiceTotals(quotation.lines, tax.regime);
  const profit = profitOf(
    quotation.lines.reduce((sum, line) => sum + lineSales(line), 0),
    quotation.lines.reduce((sum, line) => sum + lineCost(line, items), 0),
    0,
  );
  return { tax, totals, profit, costKnown: true };
}

/** QT/2627/0041, or QT/2627/0041-R2 after two revisions. */
export const quotationLabel = (quotation: Pick<Quotation, "number" | "revision">) => (quotation.revision ? `${quotation.number}-R${quotation.revision}` : quotation.number);

export const quotationNumber = (financialYear: string, sequence: number) =>
  `QT/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;

export const DEFAULT_TERMS = [
  "Rates are for delivery at our Jaigaon yard unless stated.",
  "GST extra as applicable. Exports to Bhutan under LUT where the buyer qualifies.",
  "Prices hold till the validity date; steel rates are subject to change after that.",
  "Payment as per agreed credit terms.",
].join("\n");
