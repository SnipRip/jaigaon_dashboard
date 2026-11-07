import { Injectable } from '@nestjs/common';
import { toNumber } from '../common/decimal.js';
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import { BANK_CASH_GROUPS } from '../bank-cash-accounts/bank-cash-rules.js';
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import { PrismaService } from '../database/prisma.service.js';
import { groupMap } from '../ledgers/ledger-views.js';
import { loanGroup } from '../loans/loan-kinds.js';
import { LOAN_INCLUDE, toLoanDetailView } from '../loans/loan-view.js';
import { dateOnly } from '../common/dates.js';
import {
  balanceSheet,
  groupTree,
  ledgerBalances,
  profitAndLoss,
  trialBalance,
  type BalanceSheet,
  type BookLedger,
  type Posting,
  type ProfitAndLoss,
  type TrialBalance,
} from './statements.js';
import { billPostings } from './bill-postings.js';
import { closingStock } from './closing-stock.js';
import { expensePostings } from './expense-postings.js';
import { invoicePostings } from './invoice-postings.js';
import { settlementPostings } from './settlement-postings.js';
import { stockAdjustmentPostings } from './stock-adjustment-postings.js';
import { systemLedgers } from './system-ledgers.js';

/** What every statement says about the data it was built from. */
export interface BooksBasis {
  asOf: string;
  /** Opening stock at cost from the items; closing stock from what moved since (closing-stock.ts). */
  stock: { opening: number; closing: number };
  /** Loan vouchers counted (first entries and entries up to the date). */
  voucherCount: number;
  /** Stock adjustments posted up to the date (not cancelled). */
  stockAdjustmentCount: number;
  /** Documents posted up to the date: issued invoices, open bills, live receipts, payments and expenses. */
  documentCounts: { invoices: number; bills: number; receipts: number; payments: number; expenses: number };
}

export interface TrialBalanceView extends TrialBalance, BooksBasis {}
export interface ProfitAndLossView extends ProfitAndLoss, BooksBasis {}
export interface BalanceSheetView extends BalanceSheet, BooksBasis {}

/** A bank or cash account's balance on a date: its opening plus everything posted through it. */
export interface BankCashBalanceView {
  accountId: string;
  asOf: string;
  /** Positive is money held; below zero is overdraft used. */
  balance: number;
}

/** A bank or cash account's ledger name. */
const bankCashLedger = (account: { name: string; tallyLedgerName: string | null }) => account.tallyLedgerName ?? account.name;

/** A party's ledger: its display name, under Sundry Debtors if it is a customer at all. */
const partyLedger = (party: { displayName: string; isCustomer: boolean }) => ({
  ledger: party.displayName,
  group: party.isCustomer ? 'Sundry Debtors' : 'Sundry Creditors',
});

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// The books from the start to `asOf`, as Tally shows them by default: every
// ledger every master owns with its opening balance, and the vouchers the
// app records: loan entries, stock adjustments, issued invoices, open vendor
// bills, receipts, payments and expenses (the *-postings.ts files beside
// this one). Cancelled and void documents post nothing
// (agent/accounts-plan.md, "Statements").
@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(asOf: string) {
    const db = this.prisma;
    const upTo = { lte: dateOnly(asOf) };
    const partyName = { select: { displayName: true, isCustomer: true } };
    const [groups, ledgers, heads, accounts, loans, parties, stock, adjustments, invoices, bills, settlements, expenses] = await Promise.all([
      db.ledgerGroup.findMany(),
      db.ledger.findMany(),
      db.accountHead.findMany(),
      db.bankCashAccount.findMany(),
      db.loan.findMany({ include: LOAN_INCLUDE }),
      db.party.findMany({ select: { id: true, displayName: true, isCustomer: true, openingBalance: true, openingBalanceSide: true } }),
      db.itemOpeningStock.aggregate({ _sum: { value: true } }),
      db.stockAdjustment.findMany({ where: { status: 'POSTED', date: upTo }, select: { direction: true, value: true } }),
      db.invoice.findMany({
        where: { status: 'ISSUED', date: upTo },
        select: { regime: true, taxable: true, cgst: true, sgst: true, igst: true, roundOff: true, total: true, cost: true, party: partyName },
      }),
      db.purchaseBill.findMany({
        where: { status: 'OPEN', date: upTo },
        select: {
          kind: true,
          regime: true,
          cgst: true,
          sgst: true,
          igst: true,
          tax: true,
          itcClaimable: true,
          roundOff: true,
          payable: true,
          cost: true,
          landedCostForId: true,
          vendor: partyName,
          lines: { select: { taxable: true, ownCost: true, itcEligible: true } },
          charges: { select: { amount: true, tax: true, head: { select: { name: true, nature: true } } } },
        },
      }),
      db.settlement.findMany({
        where: { cancelledAt: null, date: upTo },
        select: { direction: true, amount: true, tds: true, party: partyName, account: { select: { name: true, tallyLedgerName: true, kind: true } } },
      }),
      db.expense.findMany({
        where: { cancelledAt: null, date: upTo },
        select: {
          cgst: true,
          sgst: true,
          igst: true,
          itcEligible: true,
          total: true,
          cost: true,
          billId: true,
          head: { select: { name: true, nature: true } },
          vendor: partyName,
          account: { select: { name: true, tallyLedgerName: true, kind: true } },
        },
      }),
    ]);
    const idOf = new Map(groups.map((group) => [group.name, group.id]));
    const under = (name: TallyGroupName) => idOf.get(name) ?? null;
    const role = systemLedgers(ledgers);

    const book: BookLedger[] = [
      ...ledgers.map((ledger) => ({
        name: ledger.name,
        groupId: ledger.groupId,
        source: 'ledger' as const,
        sourceId: ledger.id,
        opening: (ledger.openingSide === 'DR' ? 1 : -1) * toNumber(ledger.openingBalance),
      })),
      ...heads.map((head) => ({ name: head.name, groupId: under(HEAD_GROUPS[head.nature]), source: 'head' as const, sourceId: head.id, opening: 0 })),
      // A bank or cash balance is a debit; an overdraft opens below zero, a credit.
      ...accounts.map((account) => ({
        name: bankCashLedger(account),
        groupId: under(BANK_CASH_GROUPS[account.kind]),
        source: 'bankCash' as const,
        sourceId: account.id,
        opening: toNumber(account.openingBalance),
      })),
      ...parties.map((party) => ({
        name: party.displayName,
        groupId: under(party.isCustomer ? 'Sundry Debtors' : 'Sundry Creditors'),
        source: 'party' as const,
        sourceId: party.id,
        opening: (party.openingBalanceSide === 'RECEIVABLE' ? 1 : -1) * toNumber(party.openingBalance),
      })),
    ];

    const postings: Posting[] = [];
    let voucherCount = 0;
    for (const loan of loans) {
      const view = toLoanDetailView(loan, asOf);
      const first = view.firstEntry;
      // A loan running before the books opens with what was owed; any other
      // first entry is a voucher on the day the money moved.
      const opening = first.type === 'Opening balance' ? first.lines.reduce((total, item) => total + item.debit - item.credit, 0) : 0;
      book.push({ name: loan.name, groupId: under(loanGroup(loan)), source: 'loan', sourceId: loan.id, opening });
      const vouchers = [
        ...(first.type === 'Opening balance' ? [] : [first]),
        ...view.entries.filter((entry) => !entry.cancelledAt).map((entry) => entry.voucher),
      ].filter((voucher) => voucher.date <= asOf);
      voucherCount += vouchers.length;
      for (const voucher of vouchers) postings.push(...voucher.lines.map((item) => ({ ledger: item.ledger, group: item.group, debit: item.debit, credit: item.credit })));
    }

    const openingStock = toNumber(stock._sum.value ?? null) ?? 0;
    book.push({ name: 'Opening Stock', groupId: under('Stock-in-Hand'), source: 'stock', sourceId: null, opening: openingStock });

    // Stock adjustments post a journal each, to the system ledgers found by role.
    const stockMoves = stockAdjustmentPostings(
      adjustments.map((adjustment) => ({ direction: adjustment.direction, value: toNumber(adjustment.value) })),
      { writeOff: role('STOCK_WRITE_OFF').ledger, found: role('STOCK_FOUND').ledger, adjustment: role('STOCK_ADJUSTMENT').ledger },
    );
    postings.push(...stockMoves.postings);

    for (const invoice of invoices) {
      const figures = {
        regime: invoice.regime,
        taxable: toNumber(invoice.taxable),
        cgst: toNumber(invoice.cgst),
        sgst: toNumber(invoice.sgst),
        igst: toNumber(invoice.igst),
        roundOff: toNumber(invoice.roundOff),
        total: toNumber(invoice.total),
      };
      postings.push(...invoicePostings(figures, partyLedger(invoice.party), role));
    }

    for (const bill of bills) {
      const figures = {
        regime: bill.regime,
        cgst: toNumber(bill.cgst),
        sgst: toNumber(bill.sgst),
        igst: toNumber(bill.igst),
        tax: toNumber(bill.tax),
        itcClaimable: toNumber(bill.itcClaimable),
        roundOff: toNumber(bill.roundOff),
        payable: toNumber(bill.payable),
        lines: bill.lines.map((line) => ({ taxable: toNumber(line.taxable), ownCost: toNumber(line.ownCost), itcEligible: line.itcEligible })),
        charges: bill.charges.map((charge) => ({ head: { ledger: charge.head.name, group: HEAD_GROUPS[charge.head.nature] }, amount: toNumber(charge.amount), tax: toNumber(charge.tax) })),
      };
      postings.push(...billPostings(figures, partyLedger(bill.vendor), role));
    }

    for (const settlement of settlements) {
      const account = { ledger: bankCashLedger(settlement.account), group: BANK_CASH_GROUPS[settlement.account.kind] };
      const figures = { direction: settlement.direction, amount: toNumber(settlement.amount), tds: toNumber(settlement.tds) };
      postings.push(...settlementPostings(figures, partyLedger(settlement.party), account, role));
    }

    for (const expense of expenses) {
      // Paid: a Payment voucher against the account; on credit: a Purchase voucher against the vendor.
      const creditTo = expense.account
        ? { ledger: bankCashLedger(expense.account), group: BANK_CASH_GROUPS[expense.account.kind] }
        : partyLedger(expense.vendor!);
      const figures = {
        cgst: toNumber(expense.cgst),
        sgst: toNumber(expense.sgst),
        igst: toNumber(expense.igst),
        itcEligible: expense.itcEligible,
        total: toNumber(expense.total),
        cost: toNumber(expense.cost),
      };
      postings.push(...expensePostings(figures, { ledger: expense.head.name, group: HEAD_GROUPS[expense.head.nature] }, creditTo, role));
    }

    const closing = closingStock({
      opening: openingStock,
      // A goods bill brings its stock in; a freight or labour bill added to it lands on the same stock.
      // Expenses allocated to a purchase's items land on its stock the same way.
      purchased:
        sum(bills.filter((bill) => bill.kind === 'GOODS' || bill.landedCostForId).map((bill) => toNumber(bill.cost))) +
        sum(expenses.filter((expense) => expense.billId).map((expense) => toNumber(expense.cost))),
      adjusted: stockMoves.closingChange,
      sold: sum(invoices.map((invoice) => toNumber(invoice.cost))),
    });

    const meta = groupMap(groups);
    const balances = ledgerBalances(book, postings, meta);
    const trial = trialBalance(groupTree(groups, balances), balances);
    const basis: BooksBasis = {
      asOf,
      stock: { opening: openingStock, closing },
      voucherCount,
      stockAdjustmentCount: adjustments.length,
      documentCounts: {
        invoices: invoices.length,
        bills: bills.length,
        receipts: settlements.filter((settlement) => settlement.direction === 'RECEIPT').length,
        payments: settlements.filter((settlement) => settlement.direction === 'PAYMENT').length,
        expenses: expenses.length,
      },
    };
    return { meta, trial, balances, basis };
  }

  async trialBalance(asOf: string): Promise<TrialBalanceView> {
    const { trial, basis } = await this.load(asOf);
    return { ...trial, ...basis };
  }

  async profitAndLoss(asOf: string): Promise<ProfitAndLossView> {
    const { trial, meta, basis } = await this.load(asOf);
    return { ...profitAndLoss(trial.groups, meta, basis.stock), ...basis };
  }

  async balanceSheet(asOf: string): Promise<BalanceSheetView> {
    const { trial, meta, basis } = await this.load(asOf);
    const pl = profitAndLoss(trial.groups, meta, basis.stock);
    return { ...balanceSheet(trial, meta, pl.netProfit, basis.stock), ...basis };
  }

  /** Every bank, overdraft and cash account's balance on the date, with loan entries, receipts, payments and expenses through it. */
  async bankCashBalances(asOf: string): Promise<BankCashBalanceView[]> {
    const { balances } = await this.load(asOf);
    return balances.filter((ledger) => ledger.source === 'bankCash' && ledger.sourceId).map((ledger) => ({ accountId: ledger.sourceId!, asOf, balance: ledger.closing }));
  }
}
