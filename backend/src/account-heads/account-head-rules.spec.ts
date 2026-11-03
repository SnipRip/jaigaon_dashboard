import { describe, expect, it } from 'vitest';
import { headProblem, HEAD_GROUPS, isExpense, settleHead, type HeadFacts } from './account-head-rules.js';

const freight: HeadFacts = { nature: 'DIRECT_EXPENSE', gst: 'OWN_RATE', gstRatePct: 5, allocation: 'SHIPMENT' };
const rent: HeadFacts = { nature: 'INDIRECT_EXPENSE', gst: 'OWN_RATE', gstRatePct: 18, allocation: 'OVERHEAD' };
const interest: HeadFacts = { nature: 'INDIRECT_INCOME', gst: null, gstRatePct: null, allocation: null };

describe('HEAD_GROUPS', () => {
  it('puts each nature under its Tally group', () => {
    expect(HEAD_GROUPS).toEqual({
      DIRECT_EXPENSE: 'Direct Expenses',
      INDIRECT_EXPENSE: 'Indirect Expenses',
      DIRECT_INCOME: 'Direct Incomes',
      INDIRECT_INCOME: 'Indirect Incomes',
    });
    expect(isExpense('DIRECT_EXPENSE')).toBe(true);
    expect(isExpense('DIRECT_INCOME')).toBe(false);
  });
});

describe('headProblem', () => {
  it('accepts expense heads with GST and allocation, and plain income heads', () => {
    expect(headProblem(freight)).toBeNull();
    expect(headProblem(rent)).toBeNull();
    expect(headProblem(interest)).toBeNull();
    expect(headProblem({ ...freight, gst: 'FOLLOWS_BILL', gstRatePct: null, allocation: 'ITEM_COST' })).toBeNull();
  });

  it('refuses expense fields on an income head', () => {
    expect(headProblem({ ...interest, gst: 'NONE' })).toBe('An income head has no GST behaviour or cost allocation');
    expect(headProblem({ ...interest, allocation: 'OVERHEAD' })).toMatch(/income head/);
  });

  it('needs GST behaviour and allocation on an expense head', () => {
    expect(headProblem({ ...freight, allocation: null })).toBe(
      'An expense head needs its GST behaviour and where the cost lands',
    );
    expect(headProblem({ ...freight, gst: null, gstRatePct: null })).toMatch(/needs/);
  });

  it('takes a GST slab only with its own rate', () => {
    expect(headProblem({ ...freight, gstRatePct: null })).toMatch(/Pick the head's GST rate/);
    expect(headProblem({ ...freight, gstRatePct: 7 })).toMatch(/Pick the head's GST rate/);
    expect(headProblem({ ...freight, gst: 'NONE' })).toBe('Only a head with its own GST rate carries a rate');
  });

  it('keeps an indirect expense an overhead', () => {
    expect(headProblem({ ...rent, allocation: 'INVOICE' })).toMatch(/indirect expense is a general overhead/);
    expect(headProblem({ ...freight, allocation: 'OVERHEAD' })).toBeNull();
  });
});

describe('settleHead', () => {
  it('drops the expense fields when a head turns into income', () => {
    const settled = settleHead(rent, { nature: 'INDIRECT_INCOME' });
    expect(settled).toEqual(interest);
    expect(headProblem(settled)).toBeNull();
  });

  it('keeps expense fields the change sends, so the rules can refuse them', () => {
    expect(headProblem(settleHead(rent, { nature: 'DIRECT_INCOME', gst: 'NONE' }))).toMatch(/income head/);
  });

  it('drops the rate when the head no longer has its own rate', () => {
    expect(settleHead(freight, { gst: 'FOLLOWS_BILL' }).gstRatePct).toBeNull();
  });

  it('leaves fields that were not sent as stored', () => {
    expect(settleHead(freight, { allocation: 'INVOICE' })).toEqual({ ...freight, allocation: 'INVOICE' });
  });
});
