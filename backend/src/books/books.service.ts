import { Injectable } from '@nestjs/common';
import { toNumber } from '../common/decimal.js';
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import { BANK_CASH_GROUPS } from '../bank-cash-accounts/bank-cash-rules.js';
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import { PrismaService } from '../database/prisma.service.js';
import { groupMap } from '../ledgers/ledger-views.js';
import { loanGroup } from '../loans/loan-kinds.js';
import { LOAN_INCLUDE, toLoanDetailView } from '../loans/loan-view.js';
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

/** What every statement says about the data it was built from. */
export interface BooksBasis {
  asOf: string;
  /** Opening stock at cost from the items; closing stock equals it until stock moves are stored. */
  stock: { opening: number; closing: number };
  /** Vouchers counted (loan first entries and entries up to the date). */
  voucherCount: number;
}

export interface TrialBalanceView extends TrialBalance, BooksBasis {}
export interface ProfitAndLossView extends ProfitAndLoss, BooksBasis {}
export interface BalanceSheetView extends BalanceSheet, BooksBasis {}

// The books from the start to `asOf`, as Tally shows them by default: every
// ledger every master owns with its opening balance, and the vouchers the
// app records. Invoices, bills, expenses and receipts post nothing until
// they are saved for real (agent/accounts-plan.md, "Statements").
@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(asOf: string) {
    const db = this.prisma;
    const [groups, ledgers, heads, accounts, loans, parties, stock] = await Promise.all([
      db.ledgerGroup.findMany(),
      db.ledger.findMany(),
      db.accountHead.findMany(),
      db.bankCashAccount.findMany(),
      db.loan.findMany({ include: LOAN_INCLUDE }),
      db.party.findMany({ select: { id: true, displayName: true, isCustomer: true, openingBalance: true, openingBalanceSide: true } }),
      db.itemOpeningStock.aggregate({ _sum: { value: true } }),
    ]);
    const idOf = new Map(groups.map((group) => [group.name, group.id]));
    const under = (name: TallyGroupName) => idOf.get(name) ?? null;

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
        name: account.tallyLedgerName ?? account.name,
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
      const opening = first.type === 'Opening balance' ? first.lines.reduce((sum, item) => sum + item.debit - item.credit, 0) : 0;
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

    const meta = groupMap(groups);
    const balances = ledgerBalances(book, postings, meta);
    const trial = trialBalance(groupTree(groups, balances), balances);
    const basis: BooksBasis = { asOf, stock: { opening: openingStock, closing: openingStock }, voucherCount };
    return { meta, trial, basis };
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
}
