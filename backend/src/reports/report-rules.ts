// Pure pieces of the reports (SOW 16): which screen each report's data comes
// from, the period, and the sums and labels the rows are built with.
import { STATE_NAMES } from '../common/gst/state-names.js';
import type { QuotationStatus, ShipmentStage } from '../generated/prisma/enums.js';
import { EXPENSES_MODULE } from '../expenses/expenses.controller.js';
import { INVOICES_MODULE } from '../invoices/invoices.controller.js';
import { ITEMS_MODULE } from '../items/items-module-key.js';
import { PROFIT_MODULE } from '../profit/profit.controller.js';
import { PURCHASE_BILLS_MODULE } from '../purchases/purchases.controllers.js';
import { QUOTATIONS_MODULE } from '../quotations/quotations.controller.js';
import { PAYMENTS_MODULE } from '../settlements/settlements.controller.js';
import { STAGE_NAMES } from '../shipments/shipment-rules.js';
import { SHIPMENTS_MODULE } from '../shipments/shipments.controller.js';

export const REPORTS_MODULE = '/reports';

/**
 * Every report and the screens whose data it shows: the role needs view on
 * all of them as well as on Reports, so a report never shows more than the
 * screens themselves would.
 */
export const REPORT_SOURCES = {
  'sales-register': [INVOICES_MODULE],
  quotations: [QUOTATIONS_MODULE],
  'purchase-register': [PURCHASE_BILLS_MODULE],
  'gst-summary': [INVOICES_MODULE, PURCHASE_BILLS_MODULE, EXPENSES_MODULE],
  'hsn-summary': [INVOICES_MODULE],
  'sales-by-state': [INVOICES_MODULE],
  'stock-summary': [ITEMS_MODULE],
  expenses: [EXPENSES_MODULE],
  outstanding: [PAYMENTS_MODULE],
  shipments: [SHIPMENTS_MODULE, PROFIT_MODULE],
  'export-register': [INVOICES_MODULE],
} as const satisfies Record<string, readonly string[]>;

export type ReportId = keyof typeof REPORT_SOURCES;

export const isReportId = (id: string): id is ReportId => Object.hasOwn(REPORT_SOURCES, id);

/** Report cells: text, numbers and ISO dates; `href` opens the row's document. */
export type ReportRow = Record<string, string | number> & { href?: string };

export const paise = (value: number) => Math.round(value * 100) / 100;

/** Sums in paise so a long column does not drift. */
export const sumOf = <T>(rows: T[], pick: (row: T) => number) => paise(rows.reduce((total, row) => total + pick(row), 0));

/** Margin on the value before GST, one decimal; none without a value. */
export const marginPct = (taxable: number, cost: number) => (taxable > 0 ? Math.round(((taxable - cost) / taxable) * 1000) / 10 : 0);

const QUOTATION_STAGES: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CONVERTED: 'Invoiced',
};

export const quotationStage = (status: QuotationStatus) => QUOTATION_STAGES[status];

/** "On the way", "Customs cleared": the stage names with a capital. */
export const shipmentStage = (stage: ShipmentStage) => STAGE_NAMES[stage].charAt(0).toUpperCase() + STAGE_NAMES[stage].slice(1);

/** Where a sale is reported: the state of supply, or the export country. */
export const placeLabel = (invoice: { kind: 'LOCAL' | 'EXPORT'; placeOfSupply: string | null; destinationCountry: string | null }) =>
  invoice.kind === 'EXPORT' ? `Export · ${invoice.destinationCountry ?? 'Bhutan'}` : ((invoice.placeOfSupply && STATE_NAMES[invoice.placeOfSupply]) ?? 'Unknown');

/** As the dashboard's low-stock card: nothing left, at or below the reorder level, or fine. */
export function stockStatus(stock: number, reorderLevel: number) {
  if (stock <= 0) return 'Out of stock';
  if (reorderLevel > 0 && stock <= reorderLevel) return 'Reorder';
  return 'OK';
}

export interface TaxHeads {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface BillTax extends TaxHeads {
  tax: number;
  itcClaimable: number;
  reverseCharge: boolean;
}

/** The credit a bill gives under each head: its tax split in the same proportion as the claimable part. */
export function claimableHeads(bill: BillTax): TaxHeads {
  const share = bill.tax > 0 ? bill.itcClaimable / bill.tax : 0;
  return { cgst: paise(bill.cgst * share), sgst: paise(bill.sgst * share), igst: paise(bill.igst * share) };
}

const addHeads = (rows: TaxHeads[]): TaxHeads => ({ cgst: sumOf(rows, (row) => row.cgst), sgst: sumOf(rows, (row) => row.sgst), igst: sumOf(rows, (row) => row.igst) });

/**
 * The 3B view: output tax on sales, reverse charge to pay in cash, input
 * credit (the claimable GST on every bill, reverse charge included once it is
 * paid, and on expenses), what is left after credit (before the set-off
 * order), and the zero-rated LUT exports.
 */
export function gstSummaryRows(sales: TaxHeads[], bills: BillTax[], expenseCredit: TaxHeads[], lutExportValue: number): ReportRow[] {
  const output = addHeads(sales);
  const reverse = addHeads(bills.filter((bill) => bill.reverseCharge));
  const credit = addHeads([...bills.map(claimableHeads), ...expenseCredit]);
  const net = (head: keyof TaxHeads) => Math.max(paise(output[head] - credit[head]), 0);
  return [
    { line: 'Output tax on sales', ...output },
    { line: 'Reverse charge payable (paid in cash)', ...reverse },
    { line: 'Input credit on bills and expenses', ...credit },
    { line: 'Net after credit, before set-off rules', cgst: net('cgst'), sgst: net('sgst'), igst: net('igst') },
    { line: 'Exports under LUT (zero-rated value)', cgst: 0, sgst: 0, igst: paise(lutExportValue) },
  ];
}

export interface HsnLine {
  hsn: string;
  uqc: string;
  ratePct: number;
  quantity: number;
  taxable: number;
  tax: number;
}

/** GSTR-1 table 12: one row per HSN, unit (UQC) and rate. */
export function hsnRows(lines: HsnLine[]): ReportRow[] {
  const rows = new Map<string, { hsn: string; uqc: string; quantity: number; rate: number; taxable: number; tax: number }>();
  for (const line of lines) {
    const key = `${line.hsn}|${line.uqc}|${line.ratePct}`;
    const row = rows.get(key) ?? { hsn: line.hsn, uqc: line.uqc, quantity: 0, rate: line.ratePct, taxable: 0, tax: 0 };
    row.quantity = Math.round((row.quantity + line.quantity) * 1000) / 1000;
    row.taxable = paise(row.taxable + line.taxable);
    row.tax = paise(row.tax + line.tax);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.hsn.localeCompare(b.hsn) || a.rate - b.rate);
}
