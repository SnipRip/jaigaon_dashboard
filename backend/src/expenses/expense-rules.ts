// Expense rules: the GST an expense carries (never picked: from the vendor
// and the head, as a charges bill), its figures, where its cost may land
// and how it is paid. Pure; expenses.service.ts loads the facts.
import { sumTax, taxOn, type TaxSplit } from '../common/gst/tax-split.js';
import type { HeadAllocation, HeadGst, HeadNature } from '../generated/prisma/enums.js';
import { chargeRate, money, type BillTax } from '../purchases/purchase-rules.js';

/** Rates a payee's bill may print (0 = no GST on it). */
export const EXPENSE_RATES = [0, 5, 12, 18, 28, 40];

/** A payee known only by name: a GST bill is taken as from our own state; without one, no GST. */
export const PAYEE_TAX: Record<'GST_BILL' | 'NO_BILL', BillTax> = {
  GST_BILL: { regime: 'INTRA_STATE', itc: true, split: 'INTRA' },
  NO_BILL: { regime: 'NO_GST', itc: false, split: 'NONE' },
};

export interface ExpenseHeadFacts {
  name: string;
  nature: HeadNature;
  gst: HeadGst | null;
  gstRatePct: number | null;
  allocation: HeadAllocation | null;
  isArchived: boolean;
}

/** The head must be a live expense head. */
export function headProblem(head: ExpenseHeadFacts | null): string | null {
  if (!head || !head.nature.endsWith('EXPENSE')) return 'Pick an expense head';
  if (head.isArchived) return `${head.name} is archived`;
  return null;
}

/**
 * A vendor's tax treatment that an expense cannot carry: a goods transport
 * agency bills freight under reverse charge, and an import goes through
 * customs; both are entered as a freight bill in Purchases.
 */
export function vendorTaxProblem(tax: BillTax): string | null {
  if (tax.regime === 'REVERSE_CHARGE') return 'A goods transport agency bills under reverse charge: enter it as a freight bill in Purchases';
  if (tax.regime === 'IMPORT') return 'A bill from an overseas or SEZ vendor goes through Purchases';
  return null;
}

export interface ExpenseFigures {
  gstRatePct: number;
  taxSplit: TaxSplit;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  /** Stored true when there is no GST: nothing is lost. */
  itcEligible: boolean;
  total: number;
  /** What reduces profit: the amount, plus GST that cannot be claimed. */
  cost: number;
}

/**
 * GST on an expense, as on a charges bill (chargeRate): none without a GST
 * bill or on a head with none, the head's own rate, else the rate printed.
 * Claimable unless blocked (s.17(5)): then the GST is part of the cost.
 */
export function expenseFigures(amount: number, tax: BillTax, head: Pick<ExpenseHeadFacts, 'gst' | 'gstRatePct'>, printedRate: number, itcEligible: boolean): ExpenseFigures {
  const gstRatePct = chargeRate(tax, head, printedRate);
  const taxSplit: TaxSplit = gstRatePct > 0 ? tax.split : 'NONE';
  const parts = taxOn(amount, gstRatePct, taxSplit);
  const total = sumTax(parts);
  const claimable = total === 0 || (tax.itc && itcEligible);
  return {
    gstRatePct: taxSplit === 'NONE' ? 0 : gstRatePct,
    taxSplit,
    ...parts,
    tax: total,
    itcEligible: claimable,
    total: money(amount + total),
    cost: claimable ? money(amount) : money(amount + total),
  };
}

/**
 * Where the cost may land: an indirect expense is always overhead; only a
 * head that lands on item cost may go on a purchase's items; a purchase or
 * an invoice must be named for those, and nothing for a shipment (linked
 * once shipments are stored) or overhead.
 */
export function allocationProblem(head: Pick<ExpenseHeadFacts, 'nature' | 'allocation' | 'name'>, allocation: HeadAllocation, targetId: string | null): string | null {
  if (head.nature === 'INDIRECT_EXPENSE' && allocation !== 'OVERHEAD') return `${head.name} is an indirect expense: it is a general overhead`;
  if (allocation === 'ITEM_COST' && head.allocation !== 'ITEM_COST') return `${head.name} does not land on item cost (freight inward, unloading, labour do)`;
  if (allocation === 'ITEM_COST' && !targetId) return 'Pick the purchase whose items carry this cost';
  if (allocation === 'INVOICE' && !targetId) return 'Pick the invoice this cost belongs to';
  if ((allocation === 'SHIPMENT' || allocation === 'OVERHEAD') && targetId) return 'A shipment or overhead expense names no purchase or invoice';
  return null;
}

/** Paid through an account (with its mode), or owed to a vendor on record. */
export function paymentProblem(paid: { accountId: string | null; mode: string | null; vendorId: string | null }): string | null {
  if (paid.accountId && !paid.mode) return 'Pick how it was paid';
  if (!paid.accountId && paid.mode) return 'Pick the account it was paid from';
  if (!paid.accountId && !paid.vendorId) return 'An expense not paid yet is owed to a vendor: pick the vendor on record';
  return null;
}

/** One payee: a vendor on record or a name. */
export function payeeProblem(vendorId: string | null, payee: string | null): string | null {
  if (vendorId && payee) return 'Name the vendor or the payee, not both';
  if (!vendorId && !payee) return 'Who was paid?';
  return null;
}
