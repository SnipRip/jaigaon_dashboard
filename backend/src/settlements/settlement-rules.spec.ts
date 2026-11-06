import { describe, expect, it } from 'vitest';
import {
  accountProblem,
  advanceLeft,
  ageBucket,
  allocationProblem,
  balanceOf,
  brcProblem,
  cashLimitProblem,
  dateProblem,
  invoiceDueDate,
  msmeDueDate,
  partyProblem,
  REFUND_DIRECTION,
  refundPartyProblem,
  refundShapeProblem,
  targetFits,
} from './settlement-rules.js';

const customer = { isCustomer: true, isVendor: false, isArchived: false };
const vendor = { isCustomer: false, isVendor: true, isArchived: false };

describe('partyProblem', () => {
  it('takes receipts from customers and pays vendors', () => {
    expect(partyProblem('RECEIPT', customer)).toBeNull();
    expect(partyProblem('PAYMENT', vendor)).toBeNull();
    expect(partyProblem('RECEIPT', vendor)).toMatch(/from a customer/);
    expect(partyProblem('PAYMENT', customer)).toMatch(/to a vendor/);
    expect(partyProblem('RECEIPT', { ...customer, isArchived: true })).toMatch(/archived/);
    expect(partyProblem('PAYMENT', null)).toMatch(/vendor to pay/);
  });
});

describe('accountProblem', () => {
  it('matches cash to a cash book and the rest to a bank', () => {
    expect(accountProblem('CASH', { kind: 'CASH', isArchived: false })).toBeNull();
    expect(accountProblem('UPI', { kind: 'BANK', isArchived: false })).toBeNull();
    expect(accountProblem('CHEQUE', { kind: 'OVERDRAFT', isArchived: false })).toBeNull();
    expect(accountProblem('CASH', { kind: 'BANK', isArchived: false })).toMatch(/cash book/);
    expect(accountProblem('BANK_TRANSFER', { kind: 'CASH', isArchived: false })).toMatch(/bank account/);
    expect(accountProblem('UPI', { kind: 'BANK', isArchived: true })).toMatch(/live account/);
  });
});

describe('dateProblem', () => {
  it('keeps the date between the account opening and today', () => {
    expect(dateProblem('2026-11-06', '2026-04-01', '2026-11-06')).toBeNull();
    expect(dateProblem('2026-11-07', '2026-04-01', '2026-11-06')).toMatch(/after today/);
    expect(dateProblem('2026-03-31', '2026-04-01', '2026-11-06')).toMatch(/opened/);
  });
});

describe('cashLimitProblem', () => {
  it('refuses ₹2 lakh or more in cash from one person in a day', () => {
    expect(cashLimitProblem('RECEIPT', 'CASH', 199_999, 0)).toBeNull();
    expect(cashLimitProblem('RECEIPT', 'CASH', 200_000, 0)).toMatch(/269ST/);
    expect(cashLimitProblem('RECEIPT', 'CASH', 50_000, 150_000)).toMatch(/269ST/);
    expect(cashLimitProblem('RECEIPT', 'UPI', 500_000, 0)).toBeNull();
    expect(cashLimitProblem('PAYMENT', 'CASH', 500_000, 0)).toBeNull();
  });
});

describe('targetFits', () => {
  it('applies receipts to invoices, payments to bills, either to the opening balance', () => {
    expect(targetFits('RECEIPT', 'INVOICE')).toBe(true);
    expect(targetFits('RECEIPT', 'BILL')).toBe(false);
    expect(targetFits('PAYMENT', 'BILL')).toBe(true);
    expect(targetFits('PAYMENT', 'INVOICE')).toBe(false);
    expect(targetFits('PAYMENT', 'OPENING')).toBe(true);
  });
});

describe('allocationProblem', () => {
  it('keeps each allocation within its balance and the total within what is free', () => {
    expect(allocationProblem([{ label: 'INV/1', amount: 100, balance: 100 }], 100)).toBeNull();
    expect(allocationProblem([{ label: 'INV/1', amount: 100.01, balance: 100 }], 200)).toMatch(/Only ₹100.00 is open on INV\/1/);
    expect(allocationProblem([{ label: 'INV/1', amount: 0, balance: 100 }], 200)).toMatch(/more than ₹0/);
    expect(
      allocationProblem(
        [
          { label: 'INV/1', amount: 60, balance: 100 },
          { label: 'INV/2', amount: 50, balance: 100 },
        ],
        100,
      ),
    ).toMatch(/110.00 is applied but only ₹100.00/);
    expect(allocationProblem([], 0)).toBeNull();
  });
});

describe('brcProblem', () => {
  it('takes a BRC on export receipts, dated between the receipt and today', () => {
    expect(brcProblem(null, '2026-11-01', '2026-11-06', false)).toBeNull();
    expect(brcProblem({ number: 'B1', date: '2026-11-02' }, '2026-11-01', '2026-11-06', true)).toBeNull();
    expect(brcProblem({ number: 'B1', date: '2026-11-02' }, '2026-11-01', '2026-11-06', false)).toMatch(/export invoice/);
    expect(brcProblem({ number: 'B1', date: '2026-10-31' }, '2026-11-01', '2026-11-06', true)).toMatch(/before the receipt/);
    expect(brcProblem({ number: 'B1', date: '2026-11-07' }, '2026-11-01', '2026-11-06', true)).toMatch(/after today/);
  });
});

describe('due dates and ageing', () => {
  it('works out due dates and caps MSME bills at 45 days', () => {
    expect(invoiceDueDate('2026-11-06', 30)).toBe('2026-12-06');
    expect(invoiceDueDate('2026-11-06', 0)).toBe('2026-11-06');
    expect(msmeDueDate('2026-11-01', '2026-12-31')).toBe('2026-12-16');
    expect(msmeDueDate('2026-11-01', '2026-11-20')).toBe('2026-11-20');
  });
  it('buckets by days late; the opening balance counts as old', () => {
    expect(ageBucket('2026-11-06', '2026-11-06')).toBe('NOT_DUE');
    expect(ageBucket('2026-11-05', '2026-11-06')).toBe('DAYS_1_30');
    expect(ageBucket('2026-10-06', '2026-11-06')).toBe('DAYS_31_60');
    expect(ageBucket('2026-09-01', '2026-11-06')).toBe('DAYS_61_90');
    expect(ageBucket('2026-08-01', '2026-11-06')).toBe('OVER_90');
    expect(ageBucket(null, '2026-11-06')).toBe('OVER_90');
  });
  it('never leaves a negative balance', () => {
    expect(balanceOf(100, 40)).toBe(60);
    expect(balanceOf(100, 100.004)).toBe(0);
  });
});

describe('refunds of advances', () => {
  it('refunds in the other direction from the advance', () => {
    expect(REFUND_DIRECTION.RECEIPT).toBe('PAYMENT');
    expect(REFUND_DIRECTION.PAYMENT).toBe('RECEIPT');
    expect(targetFits('PAYMENT', 'ADVANCE')).toBe(true);
    expect(targetFits('RECEIPT', 'ADVANCE')).toBe(true);
  });

  it('pays refunds to customers and takes them from vendors', () => {
    expect(refundPartyProblem('PAYMENT', customer)).toBeNull();
    expect(refundPartyProblem('RECEIPT', vendor)).toBeNull();
    expect(refundPartyProblem('PAYMENT', vendor)).toMatch(/customer/);
    expect(refundPartyProblem('RECEIPT', customer)).toMatch(/vendor/);
    expect(refundPartyProblem('PAYMENT', { ...customer, isArchived: true })).toMatch(/archived/);
    expect(refundPartyProblem('PAYMENT', null)).toMatch(/Pick/);
  });

  it('returns advances only, all of the amount, with no TDS or BRC', () => {
    const fine = { kinds: ['ADVANCE' as const, 'ADVANCE' as const], amount: 15_000, tds: 0, applied: 15_000, hasBrc: false };
    expect(refundShapeProblem(fine)).toBeNull();
    expect(refundShapeProblem({ ...fine, kinds: [] })).toMatch(/Pick/);
    expect(refundShapeProblem({ ...fine, kinds: ['ADVANCE', 'INVOICE'] })).toMatch(/advances only/);
    expect(refundShapeProblem({ ...fine, tds: 100 })).toMatch(/TDS/);
    expect(refundShapeProblem({ ...fine, hasBrc: true })).toMatch(/BRC/);
    expect(refundShapeProblem({ ...fine, applied: 14_000 })).toMatch(/total/);
  });

  it('leaves what is neither applied nor refunded as the advance', () => {
    expect(advanceLeft(50_000, 0, 30_000, 15_000)).toBe(5_000);
    expect(advanceLeft(9_900, 100, 0, 10_000)).toBe(0);
    expect(advanceLeft(100, 0, 60, 50)).toBe(0);
  });
});
