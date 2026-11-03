// Trial Balance, Profit & Loss and Balance Sheet as TallyPrime builds them
// (agent/accounts-plan.md, "How Tally keeps its books"). Pure: the service
// hands in every ledger with its opening balance and every voucher line.
// Amounts are signed debit-positive throughout; views flip them to each
// side's normal sign.
import { round2 } from '../loans/loan-schedule.js';
import { isBalanceSheet, placeOf, type GroupNode } from '../ledgers/ledger-group-rules.js';

/** Which master a ledger belongs to, so the screens can link to it. */
export type LedgerSource = 'ledger' | 'head' | 'bankCash' | 'loan' | 'party' | 'stock' | 'unlisted';

export interface BookLedger {
  name: string;
  /** Null: Primary (Profit & Loss A/c only). */
  groupId: string | null;
  source: LedgerSource;
  sourceId: string | null;
  /** Debit positive. */
  opening: number;
}

/** One line of a voucher, by ledger name (Tally finds ledgers by name). */
export interface Posting {
  ledger: string;
  /** The group the voucher named, used only when no master has the ledger. */
  group: string;
  debit: number;
  credit: number;
}

export interface LedgerBalance extends BookLedger {
  debit: number;
  credit: number;
  closing: number;
}

export interface GroupBalance {
  id: string;
  name: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  behavesAsSubLedger: boolean;
  groups: GroupBalance[];
  ledgers: LedgerBalance[];
}

const key = (name: string) => name.trim().toLowerCase();

/**
 * Every ledger's opening, debits, credits and closing. A voucher line naming
 * a ledger no master has (it should not happen) is kept under the group the
 * voucher gave, or Suspense A/c, so the books still balance and it shows.
 */
export function ledgerBalances(ledgers: BookLedger[], postings: Posting[], groups: Map<string, GroupNode>): LedgerBalance[] {
  const byName = new Map<string, LedgerBalance>();
  for (const ledger of ledgers) byName.set(key(ledger.name), { ...ledger, opening: round2(ledger.opening), debit: 0, credit: 0, closing: 0 });
  const groupId = (name: string) =>
    [...groups.values()].find((group) => group.name === name)?.id ?? [...groups.values()].find((group) => group.name === 'Suspense A/c')?.id ?? null;
  for (const posting of postings) {
    let ledger = byName.get(key(posting.ledger));
    if (!ledger) {
      ledger = { name: posting.ledger, groupId: groupId(posting.group), source: 'unlisted', sourceId: null, opening: 0, debit: 0, credit: 0, closing: 0 };
      byName.set(key(posting.ledger), ledger);
    }
    ledger.debit = round2(ledger.debit + posting.debit);
    ledger.credit = round2(ledger.credit + posting.credit);
  }
  return [...byName.values()].map((ledger) => ({ ...ledger, closing: round2(ledger.opening + ledger.debit - ledger.credit) }));
}

/** The group tree with each group's totals; groups ordered by position, then name. */
export function groupTree(groups: (GroupNode & { position: number; behavesAsSubLedger: boolean })[], balances: LedgerBalance[]): GroupBalance[] {
  const nodes = new Map<string, GroupBalance>();
  for (const group of groups) {
    nodes.set(group.id, { id: group.id, name: group.name, opening: 0, debit: 0, credit: 0, closing: 0, behavesAsSubLedger: group.behavesAsSubLedger, groups: [], ledgers: [] });
  }
  const order = [...groups].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const roots: GroupBalance[] = [];
  for (const group of order) {
    const node = nodes.get(group.id)!;
    if (group.parentId && nodes.has(group.parentId)) nodes.get(group.parentId)!.groups.push(node);
    else roots.push(node);
  }
  for (const ledger of balances) {
    if (ledger.groupId && nodes.has(ledger.groupId)) nodes.get(ledger.groupId)!.ledgers.push(ledger);
  }
  const total = (node: GroupBalance): GroupBalance => {
    node.ledgers.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of node.groups) total(child);
    for (const part of [...node.groups, ...node.ledgers]) {
      node.opening = round2(node.opening + part.opening);
      node.debit = round2(node.debit + part.debit);
      node.credit = round2(node.credit + part.credit);
      node.closing = round2(node.closing + part.closing);
    }
    return node;
  };
  return roots.map(total);
}

/** Sum of every opening balance; not zero means the masters' openings do not agree. */
export const openingDifference = (balances: LedgerBalance[]) => round2(balances.reduce((sum, ledger) => sum + ledger.opening, 0));

export interface TrialBalance {
  groups: GroupBalance[];
  /** The Profit & Loss A/c ledger (under Primary). */
  profitAndLoss: LedgerBalance | null;
  /** Debit positive; shown on the other side so the columns agree. */
  differenceInOpening: number;
  totalDebit: number;
  totalCredit: number;
}

/** Closing balances by group, Dr and Cr, as Tally's Trial Balance. Closing stock is not in it. */
export function trialBalance(groups: GroupBalance[], balances: LedgerBalance[]): TrialBalance {
  const primary = balances.find((ledger) => ledger.groupId === null) ?? null;
  const difference = openingDifference(balances);
  const closings = [...groups.map((group) => group.closing), primary?.closing ?? 0, -difference];
  return {
    groups,
    profitAndLoss: primary,
    differenceInOpening: difference,
    totalDebit: round2(closings.filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0)),
    totalCredit: round2(-closings.filter((amount) => amount < 0).reduce((sum, amount) => sum + amount, 0)),
  };
}

export interface StatementLine {
  name: string;
  /** In the side's normal sign: expenses and assets as debits, incomes and liabilities as credits. */
  amount: number;
  group?: GroupBalance;
}

export interface ProfitAndLoss {
  /** Trading: Dr side. */
  openingStock: number;
  tradingExpenses: StatementLine[];
  /** Trading: Cr side. */
  tradingIncomes: StatementLine[];
  closingStock: number;
  grossProfit: number;
  indirectExpenses: StatementLine[];
  indirectIncomes: StatementLine[];
  netProfit: number;
}

type GroupMeta = Map<string, GroupNode>;

const line = (group: GroupBalance, sign: 1 | -1): StatementLine => ({ name: group.name, amount: round2(sign * group.closing), group });

/**
 * Tally's horizontal P&L with gross profit: Opening Stock, Purchase Accounts
 * and Direct Expenses against Sales Accounts, Direct Incomes and Closing
 * Stock give gross profit; Indirect Incomes less Indirect Expenses then give
 * nett profit. Primary groups only: sub-groups roll up into them.
 */
export function profitAndLoss(groups: GroupBalance[], meta: GroupMeta, stock: { opening: number; closing: number }): ProfitAndLoss {
  const pick = (nature: 'INCOME' | 'EXPENSE', trading: boolean) =>
    groups
      .filter((group) => {
        const place = placeOf(meta, group.id);
        return place.nature === nature && place.affectsGrossProfit === trading;
      })
      .map((group) => line(group, nature === 'EXPENSE' ? 1 : -1));
  const sum = (lines: StatementLine[]) => lines.reduce((total, item) => total + item.amount, 0);
  const tradingExpenses = pick('EXPENSE', true);
  const tradingIncomes = pick('INCOME', true);
  const indirectExpenses = pick('EXPENSE', false);
  const indirectIncomes = pick('INCOME', false);
  const grossProfit = round2(sum(tradingIncomes) + stock.closing - sum(tradingExpenses) - stock.opening);
  return {
    openingStock: round2(stock.opening),
    tradingExpenses,
    tradingIncomes,
    closingStock: round2(stock.closing),
    grossProfit,
    indirectExpenses,
    indirectIncomes,
    netProfit: round2(grossProfit + sum(indirectIncomes) - sum(indirectExpenses)),
  };
}

export interface BalanceSheet {
  liabilities: StatementLine[];
  assets: StatementLine[];
  /** Profit & Loss A/c: brought forward (credit positive) and this period's profit. */
  profitAndLoss: { opening: number; currentPeriod: number; total: number };
  /** Credit positive: shown with the liabilities; a debit difference with the assets. */
  differenceInOpening: number;
  closingStock: number;
  totalLiabilities: number;
  totalAssets: number;
}

/**
 * Liabilities (Capital, Loans, Current Liabilities, Branch / Divisions,
 * Suspense) with Profit & Loss A/c and any difference in opening balances,
 * against assets (Fixed Assets, Investments, Current Assets with closing
 * stock, Misc. Expenses). A loss and a debit difference move to the assets.
 */
export function balanceSheet(trial: TrialBalance, meta: GroupMeta, netProfit: number, stock: { opening: number; closing: number }): BalanceSheet {
  const sheet = trial.groups.filter((group) => isBalanceSheet(placeOf(meta, group.id).nature));
  const liabilities = sheet.filter((group) => placeOf(meta, group.id).nature === 'LIABILITY').map((group) => line(group, -1));
  // Opening stock sits in Stock-in-Hand's opening; the sheet carries closing stock instead.
  const assets = sheet
    .filter((group) => placeOf(meta, group.id).nature === 'ASSET')
    .map((group) => {
      const assetLine = line(group, 1);
      return group.name === 'Current Assets' ? { ...assetLine, amount: round2(assetLine.amount - stock.opening + stock.closing) } : assetLine;
    });
  const opening = round2(-(trial.profitAndLoss?.closing ?? 0));
  const profit = { opening, currentPeriod: round2(netProfit), total: round2(opening + netProfit) };
  // Openings that run debit-heavy need the same amount on the credit side, and the other way round.
  const difference = trial.differenceInOpening;
  const sum = (lines: StatementLine[]) => lines.reduce((total, item) => total + item.amount, 0);
  const totalLiabilities = round2(sum(liabilities) + Math.max(profit.total, 0) + Math.max(difference, 0));
  const totalAssets = round2(sum(assets) + Math.max(-profit.total, 0) + Math.max(-difference, 0));
  return { liabilities, assets, profitAndLoss: profit, differenceInOpening: difference, closingStock: round2(stock.closing), totalLiabilities, totalAssets };
}
