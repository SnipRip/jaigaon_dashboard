// Receipts and payments: who may pay whom through which account, how much
// can be applied to what, the cash limit, BRC, due dates, ageing and the
// MSME 45-day rule. Pure; settlements.service.ts loads the facts.
import { addDays } from '../common/dates.js';
import type { BankCashKind, PaymentMode, SettlementDirection } from '../generated/prisma/enums.js';

const money = (value: number) => Math.round(value * 100) / 100;
const EPSILON = 0.005;

/** Cash of ₹2 lakh or more from one person in a day is barred (Income-tax Act s.269ST). */
export const CASH_RECEIPT_LIMIT = 200_000;
/** MSMED Act s.15: an MSME vendor is paid within 45 days of the bill at most. */
export const MSME_DAYS = 45;

export const WORD = { RECEIPT: 'receipt', PAYMENT: 'payment' } as const;

/** A receipt comes from a customer, a payment goes to a vendor. */
export function partyProblem(direction: SettlementDirection, party: { isCustomer: boolean; isVendor: boolean; isArchived: boolean } | null): string | null {
  if (!party) return direction === 'RECEIPT' ? 'Pick the customer who paid' : 'Pick the vendor to pay';
  if (direction === 'RECEIPT' && !party.isCustomer) return 'A receipt is from a customer';
  if (direction === 'PAYMENT' && !party.isVendor) return 'A payment is to a vendor';
  if (party.isArchived) return 'This party is archived';
  return null;
}

/** Cash goes through a cash book; bank transfer, cheque and UPI through a bank or overdraft account. */
export function accountProblem(mode: PaymentMode, account: { kind: BankCashKind; isArchived: boolean } | null): string | null {
  if (!account || account.isArchived) return 'Pick a live account from Bank & cash';
  if (mode === 'CASH' && account.kind !== 'CASH') return 'Cash goes through a cash book';
  if (mode !== 'CASH' && account.kind === 'CASH') return 'A bank transfer, cheque or UPI goes through a bank account';
  return null;
}

/** Dated on or before today and not before the account was opened in the books. */
export function dateProblem(date: string, accountOpened: string, today: string): string | null {
  if (date > today) return 'The date is after today';
  if (date < accountOpened) return 'The date is before this account was opened in the books';
  return null;
}

/** Cash received from one party on one day, this one included, stays under ₹2 lakh. */
export function cashLimitProblem(direction: SettlementDirection, mode: PaymentMode, amount: number, cashSameDay: number): string | null {
  if (direction !== 'RECEIPT' || mode !== 'CASH') return null;
  if (amount + cashSameDay >= CASH_RECEIPT_LIMIT) {
    return 'Cash of ₹2 lakh or more from one person in a day is not allowed (Income-tax Act s.269ST). Take it by bank transfer or cheque.';
  }
  return null;
}

export type TargetKind = 'INVOICE' | 'BILL' | 'EXPENSE' | 'OPENING';

/** What a direction may be applied to: receipts to invoices, payments to bills and expenses bought on credit; either to the opening balance. */
export const targetFits = (direction: SettlementDirection, kind: TargetKind) =>
  kind === 'OPENING' || (direction === 'RECEIPT' ? kind === 'INVOICE' : kind === 'BILL' || kind === 'EXPENSE');

export interface AllocationPlan {
  label: string;
  amount: number;
  balance: number;
}

/** Each allocation within its document's balance, and all of them within what is free to apply. */
export function allocationProblem(allocations: AllocationPlan[], free: number): string | null {
  for (const allocation of allocations) {
    if (!(allocation.amount > 0)) return `Apply more than ₹0 to ${allocation.label}`;
    if (allocation.amount > allocation.balance + EPSILON) return `Only ₹${allocation.balance.toFixed(2)} is open on ${allocation.label}`;
  }
  const applied = money(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
  if (applied > free + EPSILON) return `₹${applied.toFixed(2)} is applied but only ₹${free.toFixed(2)} is free to apply`;
  return null;
}

/** A BRC: only on a receipt against an export invoice, dated on or after the receipt and not after today. */
export function brcProblem(brc: { number: string; date: string } | null, receiptDate: string, today: string, hasExport: boolean): string | null {
  if (!brc) return null;
  if (!hasExport) return 'A BRC is for a receipt against an export invoice';
  if (brc.date < receiptDate) return 'The BRC is dated before the receipt';
  if (brc.date > today) return 'The BRC is dated after today';
  return null;
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** An invoice falls due after the customer's credit days. */
export const invoiceDueDate = (date: string, creditDays: number) => addDays(date, creditDays);
/** The last day to pay an MSME vendor: the bill's due date, but never more than 45 days from the bill. */
export const msmeDueDate = (billDate: string, dueDate: string) => {
  const cap = addDays(billDate, MSME_DAYS);
  return dueDate < cap ? dueDate : cap;
};

export type AgeBucket = 'NOT_DUE' | 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'OVER_90';

/** How overdue a document is on `today`; the opening balance (no due date) counts as due already. */
export function ageBucket(dueDate: string | null, today: string): AgeBucket {
  if (!dueDate) return 'OVER_90';
  const late = daysBetween(dueDate, today);
  if (late <= 0) return 'NOT_DUE';
  if (late <= 30) return 'DAYS_1_30';
  if (late <= 60) return 'DAYS_31_60';
  if (late <= 90) return 'DAYS_61_90';
  return 'OVER_90';
}

/** What is left on a document: its total less what live settlements applied to it, never below zero. */
export const balanceOf = (total: number, settled: number) => money(Math.max(total - settled, 0));
