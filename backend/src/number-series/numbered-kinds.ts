// What each numbered kind must obey. The rules come from the GST law and the
// e-invoice portal:
// - CGST rule 46(b) (invoices), 50 / 51 / 52 (receipt, refund and payment
//   vouchers), 53 (credit and debit notes): a consecutive serial number of at
//   most 16 characters, letters, digits, "-" and "/", unique for the
//   financial year, in one or more series.
// - The e-invoice portal (IRP) also wants the first character to be a letter
//   or 1–9, and checks invoices (local and export together), credit notes
//   and debit notes as separate groups.
// Kinds outside GST (quotations, internal references, master codes) keep
// the same character set, which Tally also accepts, with a longer limit.
import type { NumberedKind, NumberReset } from '../generated/prisma/enums.js';

export interface KindRules {
  /** Lower case, for messages: "sales invoice". */
  label: string;
  /** Follows the GST and e-invoice rules above. */
  gst: boolean;
  /** Numbers may not repeat inside this group. */
  scope: string;
  /** Unique within a financial year, or for ever (master codes). */
  uniquePerYear: boolean;
  maxLength: number;
  /** Characters a number may use, besides upper-case letters and digits. */
  separators: string;
  /** Resets allowed: master codes never restart. */
  resets: NumberReset[];
}

const ALL_RESETS: NumberReset[] = ['YEARLY', 'MONTHLY', 'NEVER'];
const GST_DOCUMENT = {
  gst: true,
  uniquePerYear: true,
  maxLength: 16,
  separators: '/-',
  resets: ALL_RESETS,
};
const OTHER_DOCUMENT = {
  gst: false,
  uniquePerYear: true,
  maxLength: 30,
  separators: '/-',
  resets: ALL_RESETS,
};
const MASTER_CODE = {
  gst: false,
  uniquePerYear: false,
  maxLength: 30,
  separators: '/-',
  resets: ['NEVER'] as NumberReset[],
};

export const KIND_RULES: Record<NumberedKind, KindRules> = {
  QUOTATION: { label: 'quotation', ...OTHER_DOCUMENT, scope: 'QUOTATION' },
  SALES_INVOICE: { label: 'sales invoice', ...GST_DOCUMENT, scope: 'INVOICE' },
  EXPORT_INVOICE: {
    label: 'export invoice',
    ...GST_DOCUMENT,
    scope: 'INVOICE',
  },
  // Our own reference; the vendor's bill number is stored beside it.
  PURCHASE_ORDER: { label: 'purchase order', ...OTHER_DOCUMENT, scope: 'PURCHASE_ORDER' },
  PURCHASE: { label: 'purchase', ...OTHER_DOCUMENT, scope: 'PURCHASE' },
  RECEIPT: { label: 'receipt', ...GST_DOCUMENT, scope: 'RECEIPT' },
  PAYMENT: { label: 'payment', ...GST_DOCUMENT, scope: 'PAYMENT' },
  CREDIT_NOTE: { label: 'credit note', ...GST_DOCUMENT, scope: 'CREDIT_NOTE' },
  DEBIT_NOTE: { label: 'debit note', ...GST_DOCUMENT, scope: 'DEBIT_NOTE' },
  // Entries where no money moves, such as interest credited to a loan.
  JOURNAL: { label: 'journal', ...OTHER_DOCUMENT, scope: 'JOURNAL' },
  STOCK_JOURNAL: {
    label: 'stock journal',
    ...OTHER_DOCUMENT,
    scope: 'STOCK_JOURNAL',
  },
  SHIPMENT: { label: 'shipment', ...OTHER_DOCUMENT, scope: 'SHIPMENT' },
  EXPENSE: { label: 'expense', ...OTHER_DOCUMENT, scope: 'EXPENSE' },
  CUSTOMER_CODE: {
    label: 'customer code',
    ...MASTER_CODE,
    scope: 'CUSTOMER_CODE',
  },
  VENDOR_CODE: { label: 'vendor code', ...MASTER_CODE, scope: 'VENDOR_CODE' },
  // Item SKUs never contain "/" (items/dto/create-item.dto.ts SKU_PATTERN).
  ITEM_SKU: {
    label: 'item SKU',
    ...MASTER_CODE,
    separators: '-',
    scope: 'ITEM_SKU',
  },
};

/** The order the screen lists kinds in: sales, purchases, stock, then master codes. */
export const KIND_ORDER = Object.keys(KIND_RULES) as NumberedKind[];
