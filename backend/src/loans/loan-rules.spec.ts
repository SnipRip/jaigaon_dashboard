import { describe, expect, it } from 'vitest';
import { interestLedger, loanGroup, tdsLedger, voucherTypeOf } from './loan-kinds.js';
import { entryVoucher, firstEntry, type EntryAmounts } from './loan-postings.js';
import { entryProblem, interestHeadProblem, linkedLedgerProblem, loanProblem, settleLoan, type EntryShape, type LoanFacts } from './loan-rules.js';

const truck: LoanFacts = {
  direction: 'TAKEN',
  kind: 'VEHICLE',
  repayment: 'EMI',
  isSecured: true,
  security: 'Truck WB73E1234 hypothecated',
  principal: 1_800_000,
  interestRatePct: 9.5,
  disbursedOn: '2026-10-10',
  disbursal: 'PAID_TO_SELLER',
  disbursalAccountId: null,
  assetLedgerId: 'ledger-truck',
  paidBefore: 0,
  openingOutstanding: null,
  tenureMonths: 48,
  emiAmount: 45_220,
  firstEmiDate: '2026-11-10',
  interestFrequency: null,
  firstInterestDate: null,
  maturityDate: null,
};

const ownerLoan: LoanFacts = {
  ...truck,
  kind: 'OWNER',
  repayment: 'FLEXIBLE',
  isSecured: false,
  security: null,
  principal: 500_000,
  interestRatePct: 10,
  disbursal: 'THROUGH_BANK',
  disbursalAccountId: 'bank-1',
  assetLedgerId: null,
  tenureMonths: null,
  emiAmount: null,
  firstEmiDate: null,
  interestFrequency: 'YEARLY',
  firstInterestDate: '2027-03-31',
};

const deposit: LoanFacts = {
  ...ownerLoan,
  direction: 'GIVEN',
  kind: 'DEPOSIT',
  interestRatePct: 0,
  interestFrequency: null,
  firstInterestDate: null,
  maturityDate: '2029-10-09',
};

describe('loanProblem', () => {
  it('accepts a vehicle loan, an owner loan and a deposit given', () => {
    expect(loanProblem(truck)).toBeNull();
    expect(loanProblem(ownerLoan)).toBeNull();
    expect(loanProblem(deposit)).toBeNull();
  });

  it('fits the kind and disbursal to the direction', () => {
    expect(loanProblem({ ...truck, kind: 'STAFF' })).toBe('That kind is for a loan we give');
    expect(loanProblem({ ...deposit, kind: 'GOLD' })).toBe('That kind is for a loan we take');
    expect(loanProblem({ ...deposit, disbursal: 'PAID_TO_SELLER', disbursalAccountId: null, assetLedgerId: 'X' })).toMatch(/goes out through our bank/);
  });

  it('needs the terms of its repayment style and none of the other', () => {
    expect(loanProblem({ ...truck, emiAmount: null })).toMatch(/tenure, EMI and first EMI date/);
    expect(loanProblem({ ...truck, maturityDate: '2030-01-01' })).toMatch(/for loans without an EMI/);
    expect(loanProblem({ ...ownerLoan, tenureMonths: 12 })).toMatch(/no tenure, EMI/);
    expect(loanProblem({ ...ownerLoan, interestFrequency: null })).toBe('Pick how often interest falls due');
    expect(loanProblem({ ...ownerLoan, firstInterestDate: null })).toBe('Pick the first interest date');
    expect(loanProblem({ ...ownerLoan, interestFrequency: 'AT_MATURITY', firstInterestDate: null })).toMatch(/needs the repay-by date/);
  });

  it('needs the field of its disbursal kind', () => {
    expect(loanProblem({ ...truck, assetLedgerId: null })).toMatch(/Pick the asset/);
    expect(loanProblem({ ...ownerLoan, disbursalAccountId: null })).toMatch(/Pick the bank account/);
    expect(loanProblem({ ...truck, disbursal: 'BEFORE_BOOKS', assetLedgerId: null })).toMatch(/what was owed/);
  });

  it('checks a running loan against its terms', () => {
    const running = { ...truck, disbursal: 'BEFORE_BOOKS' as const, assetLedgerId: null, paidBefore: 12 };
    expect(loanProblem({ ...running, openingOutstanding: 1_400_000 })).toBeNull();
    expect(loanProblem({ ...running, openingOutstanding: 2_000_000 })).toMatch(/more than the loan amount/);
    expect(loanProblem({ ...running, openingOutstanding: 1_400_000, paidBefore: 48 })).toMatch(/fewer than the tenure/);
    // A flexible loan may owe more than it started with (interest added, more drawn).
    const owner = { ...ownerLoan, disbursal: 'BEFORE_BOOKS' as const, disbursalAccountId: null };
    expect(loanProblem({ ...owner, openingOutstanding: 650_000 })).toBeNull();
    expect(loanProblem({ ...owner, openingOutstanding: 650_000, paidBefore: 2 })).toMatch(/only to an EMI loan/);
  });

  it('refuses an EMI below the first month’s interest, or dates before the loan', () => {
    expect(loanProblem({ ...truck, emiAmount: 14_000 })).toBe('The EMI does not cover the monthly interest');
    expect(loanProblem({ ...truck, firstEmiDate: '2026-10-01' })).toMatch(/before the loan was taken/);
    expect(loanProblem({ ...deposit, maturityDate: '2026-01-01' })).toMatch(/repay-by date/);
  });
});

describe('settleLoan', () => {
  it('clears the old disbursal fields when the kind changes', () => {
    const settled = settleLoan(truck, { disbursal: 'THROUGH_BANK', disbursalAccountId: 'bank-1' });
    expect(settled).toMatchObject({ assetLedgerId: null, disbursalAccountId: 'bank-1' });
    expect(loanProblem(settled)).toBeNull();
  });

  it('clears the other repayment style’s terms', () => {
    const flexible = settleLoan(truck, { repayment: 'FLEXIBLE', interestFrequency: 'MONTHLY', firstInterestDate: '2026-11-10' });
    expect(flexible).toMatchObject({ tenureMonths: null, emiAmount: null, firstEmiDate: null });
    expect(loanProblem(flexible)).toBeNull();
  });

  it('drops interest dates of an interest-free loan and security of an unsecured one', () => {
    expect(settleLoan(ownerLoan, { interestRatePct: 0 })).toMatchObject({ interestFrequency: null, firstInterestDate: null });
    expect(settleLoan(truck, { isSecured: false }).security).toBeNull();
  });
});

describe('Tally groups and ledgers', () => {
  it('puts each loan under its group', () => {
    expect(loanGroup(truck)).toBe('Secured Loans');
    expect(loanGroup(ownerLoan)).toBe('Unsecured Loans');
    expect(loanGroup(deposit)).toBe('Deposits (Asset)');
    expect(loanGroup({ ...deposit, kind: 'STAFF' })).toBe('Loans & Advances (Asset)');
  });

  it('uses the direction’s interest and TDS ledgers', () => {
    expect(interestLedger({ direction: 'TAKEN', interestHead: null })).toEqual({ ledger: 'Interest on Loan', group: 'Indirect Expenses' });
    expect(interestLedger({ direction: 'GIVEN', interestHead: null })).toEqual({ ledger: 'Interest Received', group: 'Indirect Incomes' });
    expect(tdsLedger({ direction: 'TAKEN', tdsLedger: null }).group).toBe('Duties & Taxes');
    expect(tdsLedger({ direction: 'GIVEN', tdsLedger: null }).group).toBe('Loans & Advances (Asset)');
  });

  it('posts interest to the loan’s head, under that head’s group', () => {
    const head = { name: 'Interest on Vehicle Loans', nature: 'DIRECT_EXPENSE' as const, isArchived: false };
    expect(interestLedger({ direction: 'TAKEN', interestHead: head })).toEqual({ ledger: 'Interest on Vehicle Loans', group: 'Direct Expenses' });
    const income = { name: 'Interest on Staff Advances', nature: 'INDIRECT_INCOME' as const, isArchived: false };
    expect(interestLedger({ direction: 'GIVEN', interestHead: income })).toEqual({ ledger: 'Interest on Staff Advances', group: 'Indirect Incomes' });
  });

  it('picks the voucher by which way the money moves', () => {
    expect(voucherTypeOf('TAKEN', 'EMI')).toBe('Payment');
    expect(voucherTypeOf('GIVEN', 'EMI')).toBe('Receipt');
    expect(voucherTypeOf('TAKEN', 'DRAWDOWN')).toBe('Receipt');
    expect(voucherTypeOf('GIVEN', 'DRAWDOWN')).toBe('Payment');
    expect(voucherTypeOf('GIVEN', 'INTEREST_ADDED')).toBe('Journal');
  });
});

describe('entryProblem', () => {
  const blank: EntryShape = { kind: 'PRINCIPAL', instalmentNo: null, principal: 0, interest: 0, tds: 0, charges: 0, bankAccountId: 'bank-1' };

  it('accepts what each loan takes', () => {
    expect(entryProblem(truck, { ...blank, kind: 'EMI', instalmentNo: 1, principal: 30_000, interest: 14_250 })).toBeNull();
    expect(entryProblem(ownerLoan, { ...blank, kind: 'INTEREST_ADDED', instalmentNo: 1, interest: 50_000, tds: 5000, bankAccountId: null })).toBeNull();
    expect(entryProblem(deposit, { ...blank, principal: 100_000 })).toBeNull();
  });

  it('refuses entries that do not fit the loan', () => {
    expect(entryProblem(truck, { ...blank, kind: 'DRAWDOWN', principal: 1 })).toMatch(/EMI loan takes/);
    expect(entryProblem(ownerLoan, { ...blank, kind: 'EMI', instalmentNo: 1, principal: 1 })).toMatch(/without an EMI takes/);
    expect(entryProblem(truck, { ...blank, kind: 'INTEREST', instalmentNo: 3, interest: 100 })).toMatch(/does not settle an EMI/);
  });

  it('checks the amounts of each kind', () => {
    expect(entryProblem(truck, { ...blank, kind: 'INTEREST', interest: 100, tds: 200 })).toBe('TDS cannot be more than the interest');
    expect(entryProblem(deposit, { ...blank, principal: 10, charges: 5 })).toBe('Bank charges apply only to a loan we take');
    expect(entryProblem(truck, { ...blank, principal: 10, interest: 5 })).toMatch(/no interest/);
    expect(entryProblem(ownerLoan, { ...blank, kind: 'INTEREST_ADDED', interest: 100 })).toBe('Interest added to the loan moves no money');
    expect(entryProblem(ownerLoan, { ...blank, kind: 'INTEREST', interest: 100, bankAccountId: null })).toBe('Pick the bank or cash account');
    expect(entryProblem({ ...ownerLoan, direction: 'GIVEN' }, { ...blank, kind: 'INTEREST_ADDED', interest: 100, tds: 10, bankAccountId: null })).toMatch(/deducted by the borrower/);
  });
});

describe('Tally vouchers', () => {
  const loanLedger = { ledger: 'HDFC Truck Loan', group: 'Secured Loans' as const };
  const bank = { ledger: 'SBI Current A/c', group: 'Bank Accounts' as const };
  const lines = (voucher: { lines: { ledger: string; debit: number; credit: number }[] }) =>
    voucher.lines.map((line) => [line.ledger, line.debit, line.credit]);
  const voucher = (direction: 'TAKEN' | 'GIVEN', kind: 'EMI' | 'PRINCIPAL' | 'INTEREST' | 'INTEREST_ADDED' | 'DRAWDOWN', amounts: Partial<EntryAmounts>) =>
    entryVoucher({
      principal: 0,
      interest: 0,
      tds: 0,
      charges: 0,
      ...amounts,
      direction,
      kind,
      date: '2026-11-10',
      voucherNumber: 'V/1',
      loanLedger,
      interestLedger: interestLedger({ direction, interestHead: null }),
      tdsLedger: tdsLedger({ direction, tdsLedger: null }),
      bank: kind === 'INTEREST_ADDED' ? null : bank,
    });

  it('books a loan paid to the seller as a journal against the asset', () => {
    const entry = firstEntry({ ...truck, loanLedger, counterpart: { ledger: 'Truck WB73E1234', group: 'Fixed Assets' } });
    expect(entry.type).toBe('Journal');
    expect(lines(entry)).toEqual([['Truck WB73E1234', 1_800_000, 0], ['HDFC Truck Loan', 0, 1_800_000]]);
  });

  it('opens a loan given as a debit, and pays it out through the bank', () => {
    const opening = firstEntry({ ...deposit, disbursal: 'BEFORE_BOOKS', openingOutstanding: 50_000, loanLedger, counterpart: null });
    expect(opening).toMatchObject({ type: 'Opening balance', lines: [{ debit: 50_000, credit: 0 }] });
    const paid = firstEntry({ ...deposit, loanLedger, counterpart: bank });
    expect(paid.type).toBe('Payment');
    expect(lines(paid)).toEqual([['HDFC Truck Loan', 500_000, 0], ['SBI Current A/c', 0, 500_000]]);
  });

  it('pays an EMI: principal, interest and charges against the bank', () => {
    expect(lines(voucher('TAKEN', 'EMI', { principal: 30_970, interest: 14_250, charges: 590 }))).toEqual([
      ['HDFC Truck Loan', 30_970, 0],
      ['Interest on Loan', 14_250, 0],
      ['Bank Charges', 590, 0],
      ['SBI Current A/c', 0, 45_810],
    ]);
  });

  it('deducts TDS from interest we pay, and credits interest added to the loan net of it', () => {
    expect(lines(voucher('TAKEN', 'INTEREST', { interest: 50_000, tds: 5000 }))).toEqual([
      ['Interest on Loan', 50_000, 0],
      ['TDS Payable on Interest', 0, 5000],
      ['SBI Current A/c', 0, 45_000],
    ]);
    const added = voucher('TAKEN', 'INTEREST_ADDED', { interest: 50_000, tds: 5000 });
    expect(added.type).toBe('Journal');
    expect(lines(added)).toEqual([
      ['Interest on Loan', 50_000, 0],
      ['TDS Payable on Interest', 0, 5000],
      ['HDFC Truck Loan', 0, 45_000],
    ]);
  });

  it('receives an EMI on a loan given, with the TDS the borrower kept', () => {
    const received = voucher('GIVEN', 'EMI', { principal: 8000, interest: 2000, tds: 200 });
    expect(received.type).toBe('Receipt');
    expect(lines(received)).toEqual([
      ['SBI Current A/c', 9800, 0],
      ['TDS Receivable', 200, 0],
      ['HDFC Truck Loan', 0, 8000],
      ['Interest Received', 0, 2000],
    ]);
  });

  it('draws more on a loan taken, lends more on a loan given', () => {
    expect(lines(voucher('TAKEN', 'DRAWDOWN', { principal: 100 }))).toEqual([['SBI Current A/c', 100, 0], ['HDFC Truck Loan', 0, 100]]);
    expect(lines(voucher('GIVEN', 'DRAWDOWN', { principal: 100 }))).toEqual([['HDFC Truck Loan', 100, 0], ['SBI Current A/c', 0, 100]]);
  });
});

describe('interest head', () => {
  const head = (nature: 'DIRECT_EXPENSE' | 'INDIRECT_EXPENSE' | 'DIRECT_INCOME' | 'INDIRECT_INCOME', isArchived = false) => ({
    name: 'Some Head',
    nature,
    isArchived,
  });

  it('takes an expense head for a loan we take and an income head for one we give', () => {
    expect(interestHeadProblem('TAKEN', head('INDIRECT_EXPENSE'))).toBeNull();
    expect(interestHeadProblem('TAKEN', head('DIRECT_EXPENSE'))).toBeNull();
    expect(interestHeadProblem('GIVEN', head('INDIRECT_INCOME'))).toBeNull();
    expect(interestHeadProblem('GIVEN', head('DIRECT_INCOME'))).toBeNull();
  });

  it('refuses the wrong side, an archived head and a missing one', () => {
    expect(interestHeadProblem('TAKEN', head('INDIRECT_INCOME'))).toMatch(/income head/);
    expect(interestHeadProblem('GIVEN', head('INDIRECT_EXPENSE'))).toMatch(/expense head/);
    expect(interestHeadProblem('TAKEN', head('INDIRECT_EXPENSE', true))).toMatch(/archived/);
    expect(interestHeadProblem('GIVEN', null)).toMatch(/pick a head/);
  });

  it('goes back to the default ledger when the loan changes direction', () => {
    const stored = { ...ownerLoan, interestHeadId: 'head-1' };
    expect(settleLoan(stored, { direction: 'GIVEN', kind: 'BUSINESS' }).interestHeadId).toBeNull();
    expect(settleLoan(stored, { direction: 'GIVEN', kind: 'BUSINESS', interestHeadId: 'head-2' }).interestHeadId).toBe('head-2');
    expect(settleLoan(stored, { principal: 1 }).interestHeadId).toBe('head-1');
  });
});

describe('ledgers a loan points at', () => {
  const ledger = (path: string[], isArchived = false) => ({ name: 'Some Ledger', isArchived, path });

  it('takes an asset under Fixed Assets, TDS under Duties & Taxes (taken) or Current Assets (given)', () => {
    expect(linkedLedgerProblem('asset', 'TAKEN', ledger(['Fixed Assets', 'Vehicles']))).toBeNull();
    expect(linkedLedgerProblem('tds', 'TAKEN', ledger(['Current Liabilities', 'Duties & Taxes']))).toBeNull();
    expect(linkedLedgerProblem('tds', 'GIVEN', ledger(['Current Assets', 'Loans & Advances (Asset)']))).toBeNull();
  });

  it('refuses the wrong group, an archived ledger and a missing one', () => {
    expect(linkedLedgerProblem('asset', 'TAKEN', ledger(['Current Assets']))).toMatch(/not under Fixed Assets/);
    expect(linkedLedgerProblem('tds', 'GIVEN', ledger(['Current Liabilities', 'Duties & Taxes']))).toMatch(/not under Current Assets/);
    expect(linkedLedgerProblem('tds', 'TAKEN', ledger(['Current Liabilities', 'Duties & Taxes'], true))).toMatch(/archived/);
    expect(linkedLedgerProblem('asset', 'TAKEN', null)).toMatch(/pick a ledger/);
  });
});
