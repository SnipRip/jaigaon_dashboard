// Outstanding, ageing, the MSME 45-day rule and party ledgers. No React.
import type { Bill } from "@/features/purchases/types";
import { daysBetween } from "@/lib/dates";
import type { OpenDocument, PaymentMode, Settlement } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "bank-transfer", label: "Bank transfer (NEFT / RTGS)" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
];

export const modeLabel = (mode: PaymentMode) => PAYMENT_MODES.find((option) => option.value === mode)?.label ?? mode;

/** Cash above ₹2 lakh from one person in a day is barred (Income-tax Act s.269ST). */
export const CASH_RECEIPT_LIMIT = 200000;

export const settledAgainst = (settlements: Settlement[], documentId: string) =>
  money(settlements.flatMap((settlement) => settlement.allocations).filter((allocation) => allocation.documentId === documentId).reduce((sum, allocation) => sum + allocation.amount, 0));

export type AgeBucket = "Not due" | "1–30 days" | "31–60 days" | "61–90 days" | "Over 90 days";
export const AGE_BUCKETS: AgeBucket[] = ["Not due", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"];

/** How overdue a document is on `today`. */
export function ageBucket(dueDate: string, today: string): AgeBucket {
  const late = daysBetween(dueDate, today);
  if (late <= 0) return "Not due";
  if (late <= 30) return "1–30 days";
  if (late <= 60) return "31–60 days";
  if (late <= 90) return "61–90 days";
  return "Over 90 days";
}

/**
 * Days left to pay an MSME vendor: 45 from the bill date at most (MSMED Act
 * s.15). Beyond it we owe interest at three times the bank rate, and the
 * unpaid amount is not deductible for income tax (s.43B(h)).
 */
export const msmeDaysLeft = (bill: Pick<Bill, "date">, today: string) => 45 - daysBetween(bill.date, today);

/** Pick documents oldest first until the amount runs out, as Zoho's "auto-apply" does. */
export function autoAllocate(amount: number, open: OpenDocument[]) {
  let left = amount;
  return [...open]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((document) => {
      const applied = money(Math.min(left, document.balance));
      left = money(left - applied);
      return { documentId: document.id, amount: applied };
    })
    .filter((allocation) => allocation.amount > 0);
}

export interface LedgerRow {
  date: string;
  description: string;
  href?: string;
  /** Raises what the party owes us (sale) or what we owe them (bill). */
  charge: number;
  /** Money that settles it. */
  settle: number;
  balance: number;
}

/** A party's statement: documents and settlements by date with a running balance. */
export function ledgerRows(opening: number, documents: OpenDocument[], settlements: Settlement[]): LedgerRow[] {
  const entries = [
    ...documents.map((document) => ({ date: document.date, description: document.number, href: document.href, charge: document.total, settle: 0 })),
    ...settlements.map((settlement) => ({
      date: settlement.date,
      description: `${settlement.number} · ${modeLabel(settlement.mode)}${settlement.reference ? ` ${settlement.reference}` : ""}`,
      href: undefined,
      charge: 0,
      settle: settlement.amount + (settlement.tds ?? 0),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || b.charge - a.charge);

  let balance = opening;
  return entries.map((entry) => {
    balance = money(balance + entry.charge - entry.settle);
    return { ...entry, balance };
  });
}

export const settlementNumber = (direction: Settlement["direction"], financialYear: string, sequence: number) =>
  `${direction === "in" ? "RCT" : "PAY"}/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;
