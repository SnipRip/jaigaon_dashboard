// How the screen names each numbered kind, and the format it suggests first.
// The rules each kind obeys live in the backend
// (backend/src/number-series/numbered-kinds.ts).
import type { NumberedKind, NumberingMethod, NumberReset } from "@/types/number-series";

interface KindInfo {
  label: string;
  group: "Sales" | "Purchases and payments" | "Stock and export" | "Master codes";
  /** Follows GST rule 46 and the e-invoice portal: 16 characters, unique in the year. */
  gst: boolean;
  suggested: { pattern: string; reset: NumberReset };
}

const yearly = (pattern: string) => ({ pattern, reset: "YEARLY" as const });
const never = (pattern: string) => ({ pattern, reset: "NEVER" as const });

export const KINDS: Record<NumberedKind, KindInfo> = {
  QUOTATION: { label: "Quotation", group: "Sales", gst: false, suggested: yearly("QT/{FY}/{SEQ:4}") },
  SALES_INVOICE: { label: "Local tax invoice", group: "Sales", gst: true, suggested: yearly("INV/{FY}/{SEQ:4}") },
  EXPORT_INVOICE: { label: "Export invoice", group: "Sales", gst: true, suggested: yearly("EXP/{FY}/{SEQ:4}") },
  RECEIPT: { label: "Receipt (customers, loans)", group: "Sales", gst: true, suggested: yearly("RCT/{FY}/{SEQ:4}") },
  CREDIT_NOTE: { label: "Credit note", group: "Sales", gst: true, suggested: yearly("CN/{FY}/{SEQ:4}") },
  PURCHASE_ORDER: { label: "Purchase order", group: "Purchases and payments", gst: false, suggested: yearly("PO/{FY}/{SEQ:4}") },
  PURCHASE: { label: "Vendor bill (our reference)", group: "Purchases and payments", gst: false, suggested: yearly("PUR/{FY}/{SEQ:4}") },
  PAYMENT: { label: "Payment (vendors, loans)", group: "Purchases and payments", gst: true, suggested: yearly("PAY/{FY}/{SEQ:4}") },
  DEBIT_NOTE: { label: "Debit note", group: "Purchases and payments", gst: true, suggested: yearly("DN/{FY}/{SEQ:4}") },
  JOURNAL: { label: "Journal (interest added to loans)", group: "Purchases and payments", gst: false, suggested: yearly("JV/{FY}/{SEQ:4}") },
  EXPENSE: { label: "Expense", group: "Purchases and payments", gst: false, suggested: yearly("EXPN/{FY}/{SEQ:4}") },
  STOCK_JOURNAL: { label: "Stock adjustment", group: "Stock and export", gst: false, suggested: yearly("SJ/{FY}/{SEQ:4}") },
  STOCK_TRANSFER: { label: "Stock transfer", group: "Stock and export", gst: false, suggested: yearly("ST/{FY}/{SEQ:4}") },
  SHIPMENT: { label: "Shipment", group: "Stock and export", gst: false, suggested: yearly("SHP/{FY}/{SEQ:4}") },
  CUSTOMER_CODE: { label: "Customer code", group: "Master codes", gst: false, suggested: never("C{SEQ:5}") },
  VENDOR_CODE: { label: "Vendor code", group: "Master codes", gst: false, suggested: never("V{SEQ:5}") },
  ITEM_SKU: { label: "Item SKU", group: "Master codes", gst: false, suggested: never("SKU-{SEQ:5}") },
};

export const isMasterCode = (kind: NumberedKind) => KINDS[kind].group === "Master codes";

/** Tally's names for the methods, so the accountant recognises them. */
export const METHODS: { value: NumberingMethod; label: string; short: string }[] = [
  { value: "AUTOMATIC", label: "Automatic: always the next number", short: "Automatic" },
  { value: "AUTOMATIC_MANUAL_OVERRIDE", label: "Automatic (manual override): next number unless one is typed", short: "Auto, can type" },
  { value: "MANUAL", label: "Manual: typed on every entry", short: "Manual" },
];

export const RESETS: { value: NumberReset; label: string }[] = [
  { value: "YEARLY", label: "Every financial year (1 April)" },
  { value: "MONTHLY", label: "Every month" },
  { value: "NEVER", label: "Never" },
];

export const resetLabel = (reset: NumberReset) => ({ YEARLY: "Yearly", MONTHLY: "Monthly", NEVER: "Never" })[reset];
