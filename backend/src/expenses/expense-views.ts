// Expenses as the API returns them: Decimals as numbers, dates as
// YYYY-MM-DD, the head with its Tally group, and what it was allocated to.
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { Posting } from '../books/statements.js';

export const expenseInclude = {
  head: { select: { id: true, name: true, nature: true } },
  vendor: { select: { displayName: true, isCustomer: true } },
  account: { select: { name: true, tallyLedgerName: true, kind: true } },
  bill: { select: { reference: true, vendorBillNumber: true } },
  invoice: { select: { number: true } },
} as const satisfies Prisma.ExpenseInclude;

export type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export interface ExpenseVoucherView {
  type: 'Payment' | 'Purchase';
  lines: Posting[];
}

export const toExpenseView = (row: ExpenseRow, settled = 0, voucher: ExpenseVoucherView | null = null) => {
  const total = toNumber(row.total);
  const onCredit = !row.accountId;
  return {
    id: row.id,
    number: row.number,
    date: isoDate(row.date),
    head: { id: row.head.id, name: row.head.name, tallyGroup: HEAD_GROUPS[row.head.nature] },
    description: row.description,
    reference: row.reference,
    vendorId: row.vendorId,
    payeeName: row.vendor?.displayName ?? row.payee ?? '',
    accountId: row.accountId,
    accountName: row.account?.name ?? null,
    mode: row.mode,
    dueDate: row.dueDate ? isoDate(row.dueDate) : null,
    taxSplit: row.taxSplit as 'INTRA' | 'INTER' | 'NONE',
    amount: toNumber(row.amount),
    gstRatePct: toNumber(row.gstRatePct),
    cgst: toNumber(row.cgst),
    sgst: toNumber(row.sgst),
    igst: toNumber(row.igst),
    tax: toNumber(row.tax),
    itcEligible: row.itcEligible,
    total,
    cost: toNumber(row.cost),
    allocation: row.allocation,
    /** The goods bill or invoice the cost lands on; null for a shipment (not linked yet) or overhead. */
    target: row.billId
      ? { kind: 'BILL' as const, id: row.billId, number: row.bill!.reference }
      : row.invoiceId
        ? { kind: 'INVOICE' as const, id: row.invoiceId, number: row.invoice!.number }
        : null,
    /** On credit: what live vendor payments settled, and what is still owed. */
    settled: onCredit ? settled : total,
    balance: onCredit ? Math.max(Math.round((total - settled) * 100) / 100, 0) : 0,
    notes: row.notes,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    voucher,
  };
};

export type ExpenseView = ReturnType<typeof toExpenseView>;
