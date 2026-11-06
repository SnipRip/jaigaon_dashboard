import { describe, expect, it } from 'vitest';
import { allocationProblem, expenseFigures, PAYEE_TAX, paymentProblem, payeeProblem, vendorTaxProblem } from './expense-rules.js';

const ownRate = { gst: 'OWN_RATE' as const, gstRatePct: 18 };
const followsBill = { gst: 'FOLLOWS_BILL' as const, gstRatePct: null };
const noGst = { gst: 'NONE' as const, gstRatePct: null };
const interState = { regime: 'INTER_STATE' as const, itc: true, split: 'INTER' as const };

describe('expenseFigures', () => {
  it('takes the head’s own rate, split CGST + SGST for a local GST bill', () => {
    expect(expenseFigures(1000, PAYEE_TAX.GST_BILL, ownRate, 5, true)).toEqual({
      gstRatePct: 18,
      taxSplit: 'INTRA',
      cgst: 90,
      sgst: 90,
      igst: 0,
      tax: 180,
      itcEligible: true,
      total: 1180,
      cost: 1000,
    });
  });

  it('takes the printed rate on a head that follows the bill, IGST from another state', () => {
    const figures = expenseFigures(4800, interState, followsBill, 5, true);
    expect(figures).toMatchObject({ gstRatePct: 5, taxSplit: 'INTER', igst: 240, total: 5040, cost: 4800 });
  });

  it('carries no GST on a head with none or without a GST bill', () => {
    expect(expenseFigures(850, PAYEE_TAX.GST_BILL, noGst, 18, true)).toMatchObject({ gstRatePct: 0, taxSplit: 'NONE', tax: 0, total: 850, cost: 850 });
    expect(expenseFigures(850, PAYEE_TAX.NO_BILL, ownRate, 18, true)).toMatchObject({ gstRatePct: 0, tax: 0, total: 850 });
  });

  it('puts blocked GST into the cost', () => {
    expect(expenseFigures(2000, PAYEE_TAX.GST_BILL, ownRate, 0, false)).toMatchObject({ tax: 360, itcEligible: false, total: 2360, cost: 2360 });
  });

  it('keeps itcEligible true when there is no GST to lose', () => {
    expect(expenseFigures(500, PAYEE_TAX.NO_BILL, ownRate, 0, false).itcEligible).toBe(true);
  });
});

describe('vendorTaxProblem', () => {
  it('sends reverse charge and imports to Purchases', () => {
    expect(vendorTaxProblem({ regime: 'REVERSE_CHARGE', itc: true, split: 'INTRA' })).toMatch(/freight bill/);
    expect(vendorTaxProblem({ regime: 'IMPORT', itc: true, split: 'INTER' })).toMatch(/Purchases/);
    expect(vendorTaxProblem(interState)).toBeNull();
  });
});

describe('allocationProblem', () => {
  const direct = { name: 'Freight Inward', nature: 'DIRECT_EXPENSE' as const, allocation: 'ITEM_COST' as const };
  it('keeps an indirect expense on overhead', () => {
    expect(allocationProblem({ name: 'Rent', nature: 'INDIRECT_EXPENSE', allocation: 'OVERHEAD' }, 'INVOICE', 'x')).toMatch(/overhead/);
  });
  it('lets only an item-cost head land on a purchase, which must be named', () => {
    expect(allocationProblem({ ...direct, allocation: 'INVOICE' }, 'ITEM_COST', 'bill')).toMatch(/does not land/);
    expect(allocationProblem(direct, 'ITEM_COST', null)).toMatch(/purchase/);
    expect(allocationProblem(direct, 'ITEM_COST', 'bill')).toBeNull();
  });
  it('names an invoice for an invoice, nothing for a shipment or overhead', () => {
    expect(allocationProblem(direct, 'INVOICE', null)).toMatch(/invoice/);
    expect(allocationProblem(direct, 'SHIPMENT', 'x')).toMatch(/names no/);
    expect(allocationProblem(direct, 'SHIPMENT', null)).toBeNull();
  });
});

describe('payment and payee', () => {
  it('needs a vendor when nothing is paid yet', () => {
    expect(paymentProblem({ accountId: null, mode: null, vendorId: null })).toMatch(/vendor/);
    expect(paymentProblem({ accountId: null, mode: null, vendorId: 'v' })).toBeNull();
    expect(paymentProblem({ accountId: 'a', mode: null, vendorId: null })).toMatch(/how/);
    expect(paymentProblem({ accountId: 'a', mode: 'CASH', vendorId: null })).toBeNull();
  });
  it('takes one payee', () => {
    expect(payeeProblem('v', 'name')).toMatch(/not both/);
    expect(payeeProblem(null, null)).toMatch(/Who/);
    expect(payeeProblem(null, 'LCS counter')).toBeNull();
  });
});
