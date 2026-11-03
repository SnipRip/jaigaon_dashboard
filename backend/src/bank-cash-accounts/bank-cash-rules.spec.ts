import { describe, expect, it } from 'vitest';
import { accountProblem, settleAccount, type AccountFacts } from './bank-cash-rules.js';

const bank: AccountFacts = {
  kind: 'BANK',
  bankName: 'State Bank of India',
  branch: 'Jaigaon',
  accountNumber: '000000000101',
  ifsc: 'SBIN0000001',
  upiId: 'jaigaonquality@sbi',
  openingBalance: 450000,
  showOnInvoice: true,
  isArchived: false,
};

const cash: AccountFacts = {
  kind: 'CASH',
  bankName: null,
  branch: null,
  accountNumber: null,
  ifsc: null,
  upiId: null,
  openingBalance: 25000,
  showOnInvoice: false,
  isArchived: false,
};

describe('accountProblem', () => {
  it('accepts a full bank account and a plain cash account', () => {
    expect(accountProblem(bank)).toBeNull();
    expect(accountProblem(cash)).toBeNull();
  });

  it('refuses bank details on a cash account', () => {
    expect(accountProblem({ ...cash, ifsc: 'SBIN0000001' })).toBe('A cash account has no bank details');
    expect(accountProblem({ ...cash, showOnInvoice: true })).toBe('Only a bank account can print on invoices');
  });

  it('needs bank name, account number and IFSC on a bank or overdraft account', () => {
    expect(accountProblem({ ...bank, ifsc: null })).toBe(
      'A bank account needs the bank name, account number and IFSC',
    );
    expect(accountProblem({ ...bank, kind: 'OVERDRAFT', accountNumber: null })).toMatch(/needs/);
  });

  it('lets only an overdraft open below zero', () => {
    expect(accountProblem({ ...bank, kind: 'OVERDRAFT', openingBalance: -150000 })).toBeNull();
    expect(accountProblem({ ...bank, openingBalance: -1 })).toBe(
      'Only an overdraft or cash credit account can open below zero',
    );
    expect(accountProblem({ ...cash, openingBalance: -1 })).toMatch(/below zero/);
  });

  it('keeps an archived account off invoices', () => {
    expect(accountProblem({ ...bank, isArchived: true })).toBe('An archived account cannot print on invoices');
  });
});

describe('settleAccount', () => {
  it('clears the bank fields when an account turns into cash', () => {
    const settled = settleAccount(bank, { kind: 'CASH', showOnInvoice: false });
    expect(settled).toMatchObject({ bankName: null, branch: null, accountNumber: null, ifsc: null, upiId: null });
    expect(accountProblem(settled)).toBeNull();
  });

  it('keeps bank fields the change sends, so the rules can refuse them', () => {
    const settled = settleAccount(bank, { kind: 'CASH', ifsc: 'HDFC0000002', showOnInvoice: false });
    expect(accountProblem(settled)).toBe('A cash account has no bank details');
  });

  it('takes an archived account off invoices', () => {
    const settled = settleAccount(bank, { isArchived: true });
    expect(settled.showOnInvoice).toBe(false);
    expect(accountProblem(settled)).toBeNull();
  });

  it('leaves fields that were not sent as stored', () => {
    expect(settleAccount(bank, { branch: 'Siliguri' })).toEqual({ ...bank, branch: 'Siliguri' });
  });
});
