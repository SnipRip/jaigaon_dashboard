import { describe, expect, it } from 'vitest';
import type { GroupNode } from '../ledgers/ledger-group-rules.js';
import { balanceSheet, groupTree, ledgerBalances, profitAndLoss, trialBalance, type BookLedger, type Posting } from './statements.js';
import { DEFAULT_STOCK_LEDGERS, stockAdjustmentPostings } from './stock-adjustment-postings.js';

// A slice of Tally's groups, enough for a small set of books.
const rows: [string, string | null, GroupNode['nature'], boolean][] = [
  ['Capital Account', null, 'LIABILITY', false],
  ['Loans (Liability)', null, 'LIABILITY', false],
  ['Secured Loans', 'Loans (Liability)', null, false],
  ['Current Liabilities', null, 'LIABILITY', false],
  ['Suspense A/c', null, 'LIABILITY', false],
  ['Fixed Assets', null, 'ASSET', false],
  ['Current Assets', null, 'ASSET', false],
  ['Bank Accounts', 'Current Assets', null, false],
  ['Sundry Debtors', 'Current Assets', null, false],
  ['Stock-in-Hand', 'Current Assets', null, false],
  ['Sales Accounts', null, 'INCOME', true],
  ['Indirect Incomes', null, 'INCOME', false],
  ['Purchase Accounts', null, 'EXPENSE', true],
  ['Indirect Expenses', null, 'EXPENSE', false],
];
const groups = rows.map(([name, parent, nature, affectsGrossProfit], position) => ({
  id: name,
  name,
  parentId: parent,
  nature,
  affectsGrossProfit,
  isPredefined: true,
  position,
  behavesAsSubLedger: false,
}));
const meta = new Map<string, GroupNode>(groups.map((group) => [group.id, group]));

const ledger = (name: string, groupId: string | null, opening = 0): BookLedger => ({ name, groupId, source: 'ledger', sourceId: null, opening });
const post = (dr: string, cr: string, amount: number, group = ''): Posting[] => [
  { ledger: dr, group, debit: amount, credit: 0 },
  { ledger: cr, group, debit: 0, credit: amount },
];

function books(ledgers: BookLedger[], postings: Posting[], stock = { opening: 30_000, closing: 30_000 }) {
  const balances = ledgerBalances([...ledgers, { ...ledger('Opening Stock', 'Stock-in-Hand', stock.opening), source: 'stock' }], postings, meta);
  const trial = trialBalance(groupTree(groups, balances), balances);
  const pl = profitAndLoss(trial.groups, meta, stock);
  return { balances, trial, pl, sheet: balanceSheet(trial, meta, pl.netProfit, stock) };
}

const opening = [
  ledger("Owner's Capital", 'Capital Account', -100_000),
  ledger('SBI Current', 'Bank Accounts', 60_000),
  ledger('Siliguri Infra', 'Sundry Debtors', 10_000),
  ledger('Profit & Loss A/c', null),
];
const vouchers = [...post('SBI Current', 'HDFC Truck Loan', 50_000), ...post('Interest on Loan', 'SBI Current', 1_000)];
const withLedgers = [...opening, ledger('HDFC Truck Loan', 'Secured Loans'), ledger('Interest on Loan', 'Indirect Expenses')];

describe('books', () => {
  it('keeps the trial balance in agreement', () => {
    const { trial } = books(withLedgers, vouchers);
    expect(trial.differenceInOpening).toBe(0);
    expect(trial.totalDebit).toBe(trial.totalCredit);
    expect(trial.totalDebit).toBe(150_000);
  });

  it('works out gross and nett profit with stock', () => {
    const { pl } = books(withLedgers, [...vouchers, ...post('SBI Current', 'Sales - GST Local', 40_000, 'Sales Accounts')], { opening: 30_000, closing: 5_000 });
    // Sales 40,000 + closing 5,000 − opening 30,000.
    expect(pl.grossProfit).toBe(15_000);
    expect(pl.netProfit).toBe(14_000);
  });

  it('shows a sub-group whose balance runs the other way on the other side', () => {
    const tree = [...groups, { id: 'Duties & Taxes', name: 'Duties & Taxes', parentId: 'Current Liabilities', nature: null, affectsGrossProfit: false, isPredefined: true, position: 99, behavesAsSubLedger: false }];
    const treeMeta = new Map<string, GroupNode>(tree.map((group) => [group.id, group]));
    const ledgers = [
      ledger("Owner's Capital", 'Capital Account', -100_000),
      ledger('SBI Current', 'Bank Accounts', 100_000),
      ledger('Input IGST', 'Duties & Taxes'),
      ledger('Output IGST', 'Duties & Taxes'),
      ledger('Tata Steel', 'Current Liabilities'),
      ledger('Profit & Loss A/c', null),
    ];
    // Input credit 1,800 against output 900: Duties & Taxes is 900 Dr.
    const moves = [...post('Input IGST', 'Tata Steel', 1_800), ...post('SBI Current', 'Output IGST', 900)];
    const balances = ledgerBalances(ledgers, moves, treeMeta);
    const trial = trialBalance(groupTree(tree, balances), balances);
    const sheet = balanceSheet(trial, treeMeta, 0, { opening: 0, closing: 0 });
    expect(sheet.liabilities.find((item) => item.name === 'Current Liabilities')?.amount).toBe(1_800);
    expect(sheet.assets.find((item) => item.name === 'Duties & Taxes')).toMatchObject({ amount: 900, movedFrom: 'Current Liabilities' });
    expect(sheet.totalLiabilities).toBe(101_800);
    expect(sheet.totalAssets).toBe(101_800);
  });

  it('balances the sheet, carrying a loss to the assets', () => {
    const { sheet, pl } = books(withLedgers, vouchers);
    expect(pl.netProfit).toBe(-1_000);
    expect(sheet.profitAndLoss.total).toBe(-1_000);
    expect(sheet.totalLiabilities).toBe(150_000);
    expect(sheet.totalAssets).toBe(150_000);
  });

  it('shows openings that do not agree as a difference', () => {
    const { trial, sheet } = books(withLedgers.slice(1), vouchers);
    // Bank 60,000 + debtor 10,000 + stock 30,000, with no capital against them.
    expect(trial.differenceInOpening).toBe(100_000);
    expect(trial.totalDebit).toBe(trial.totalCredit);
    expect(sheet.differenceInOpening).toBe(100_000);
    expect(sheet.totalLiabilities).toBe(sheet.totalAssets);
  });

  it('keeps a voucher line no master has, under its group or Suspense', () => {
    const balances = ledgerBalances(opening, post('Mystery', 'SBI Current', 10, 'Nowhere'), meta);
    expect(balances.find((item) => item.name === 'Mystery')).toMatchObject({ groupId: 'Suspense A/c', source: 'unlisted', closing: 10 });
  });
});

describe('stock adjustments in the books', () => {
  const stockLedgers = [
    ledger('Stock Written Off', 'Indirect Expenses'),
    ledger('Stock Excess Found', 'Indirect Incomes'),
    ledger('Stock Adjustment', 'Purchase Accounts'),
  ];

  it('takes a write-off out of net profit and closing stock, not gross profit', () => {
    const before = books(withLedgers, vouchers);
    const { postings, closingChange } = stockAdjustmentPostings([{ direction: 'OUT', value: 1_260 }], DEFAULT_STOCK_LEDGERS);
    const after = books([...withLedgers, ...stockLedgers], [...vouchers, ...postings], { opening: 30_000, closing: 30_000 + closingChange });
    expect(closingChange).toBe(-1_260);
    expect(after.pl.grossProfit).toBe(before.pl.grossProfit);
    expect(after.pl.netProfit).toBe(before.pl.netProfit - 1_260);
    expect(after.trial.totalDebit).toBe(after.trial.totalCredit);
    expect(after.sheet.totalAssets).toBe(after.sheet.totalLiabilities);
  });

  it('adds stock found to net profit and closing stock', () => {
    const before = books(withLedgers, vouchers);
    const { postings, closingChange } = stockAdjustmentPostings(
      [
        { direction: 'IN', value: 250 },
        { direction: 'OUT', value: 100 },
      ],
      DEFAULT_STOCK_LEDGERS,
    );
    const after = books([...withLedgers, ...stockLedgers], [...vouchers, ...postings], { opening: 30_000, closing: 30_000 + closingChange });
    expect(closingChange).toBe(150);
    expect(after.pl.grossProfit).toBe(before.pl.grossProfit);
    expect(after.pl.netProfit).toBe(before.pl.netProfit + 150);
    expect(after.sheet.totalAssets).toBe(after.sheet.totalLiabilities);
  });
});
