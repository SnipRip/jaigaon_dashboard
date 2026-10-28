// Quotation status, totals and profit. No React. GST follows the customer
// exactly as on an invoice (gst-rules.ts); profit is on the value before GST.
import { saleTax } from "@/features/gst/gst-rules";
import { invoiceTotals } from "@/features/invoices/invoice-rules";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { lineCost, lineSales, profitOf } from "@/features/profit/profit-rules";
import type { Quotation, QuotationStatus } from "./types";

export type QuotationStage = "Draft" | "Sent" | "Expired" | "Accepted" | "Rejected" | "Converted";

/** A sent quotation past its validity reads as expired; only the browser knows today. */
export function quotationStage(quotation: Pick<Quotation, "status" | "validUntil">, today: string | null): QuotationStage {
  const map: Record<QuotationStatus, QuotationStage> = { draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", converted: "Converted" };
  if (quotation.status === "sent" && today && today > quotation.validUntil) return "Expired";
  return map[quotation.status];
}

export const quotationTax = (companyState: string, party: Party) =>
  saleTax(companyState, { treatment: party.treatment, stateCode: party.placeOfSupply, exportRoute: party.exportRoute });

export function quotationFigures(quotation: Pick<Quotation, "lines">, party: Party, companyState: string, items: Item[]) {
  const tax = quotationTax(companyState, party);
  const totals = invoiceTotals(quotation.lines, tax.regime);
  const profit = profitOf(
    quotation.lines.reduce((sum, line) => sum + lineSales(line), 0),
    quotation.lines.reduce((sum, line) => sum + lineCost(line, items), 0),
    0,
  );
  return { tax, totals, profit };
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
