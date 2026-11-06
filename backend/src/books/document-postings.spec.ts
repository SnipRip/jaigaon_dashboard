import { describe, expect, it } from 'vitest';
import { customerOwes } from '../invoices/invoice-rules.js';
import { billPostings, type PostedBill } from './bill-postings.js';
import { closingStock } from './closing-stock.js';
import { expensePostings } from './expense-postings.js';
import { invoicePostings } from './invoice-postings.js';
import { settlementPostings } from './settlement-postings.js';
import type { Posting } from './statements.js';
import { systemLedgers } from './system-ledgers.js';
import { imbalance } from './voucher-lines.js';

const ledgers = systemLedgers([{ name: 'Round Off A/c', systemRole: 'ROUND_OFF' }]);
const customer = { ledger: 'Dorji Traders', group: 'Sundry Debtors' };
const vendor = { ledger: 'Tata Steel Ltd', group: 'Sundry Creditors' };
const bank = { ledger: 'SBI Current', group: 'Bank Accounts' };

/** Signed (debit positive) amount per ledger, for compact assertions. */
const byLedger = (lines: Posting[]) => Object.fromEntries(lines.map((line) => [line.ledger, Math.round((line.debit - line.credit) * 100) / 100]));

describe('system ledgers', () => {
  it('finds a renamed ledger by its role, else the seeded name and its home group', () => {
    expect(ledgers('ROUND_OFF')).toEqual({ ledger: 'Round Off A/c', group: 'Indirect Expenses' });
    expect(ledgers('TDS_PAYABLE_VENDOR')).toEqual({ ledger: 'TDS Payable on Vendor Payments', group: 'Duties & Taxes' });
  });
});

describe('invoice postings', () => {
  it('books a local invoice to sales, CGST + SGST and round off', () => {
    const lines = invoicePostings({ regime: 'INTRA_STATE', taxable: 10_000.4, cgst: 900.04, sgst: 900.04, igst: 0, roundOff: -0.48, total: 11_800 }, customer, ledgers);
    expect(byLedger(lines)).toEqual({
      'Dorji Traders': 11_800,
      'Sales - GST Local': -10_000.4,
      'Output CGST': -900.04,
      'Output SGST': -900.04,
      'Round Off A/c': 0.48,
    });
    expect(imbalance(lines)).toBe(0);
  });

  it('books an interstate invoice to IGST', () => {
    const lines = invoicePostings({ regime: 'INTER_STATE', taxable: 5_000, cgst: 0, sgst: 0, igst: 900, roundOff: 0, total: 5_900 }, customer, ledgers);
    expect(byLedger(lines)).toEqual({ 'Dorji Traders': 5_900, 'Sales - GST Interstate': -5_000, 'Output IGST': -900 });
  });

  it('books an export under LUT with no GST', () => {
    const lines = invoicePostings({ regime: 'EXPORT_LUT', taxable: 2_00_000, cgst: 0, sgst: 0, igst: 0, roundOff: 0, total: 2_00_000 }, customer, ledgers);
    expect(byLedger(lines)).toEqual({ 'Dorji Traders': 2_00_000, 'Export Sales - LUT': -2_00_000 });
  });

  it('books IGST on an export as ours to claim back: the buyer owes the goods value', () => {
    const invoice = { regime: 'EXPORT_IGST' as const, taxable: 1_000.4, cgst: 0, sgst: 0, igst: 180.07, roundOff: -0.47, total: 1_180 };
    const lines = invoicePostings(invoice, customer, ledgers);
    expect(customerOwes(invoice)).toBe(999.93);
    expect(byLedger(lines)).toEqual({
      'Dorji Traders': 999.93,
      'IGST Refund Receivable': 180.07,
      'Export Sales - IGST': -1_000.4,
      'Output IGST': -180.07,
      'Round Off A/c': 0.47,
    });
    expect(imbalance(lines)).toBe(0);
  });
});

const bill = (overrides: Partial<PostedBill>): PostedBill => ({
  regime: 'INTRA_STATE',
  cgst: 0,
  sgst: 0,
  igst: 0,
  tax: 0,
  itcClaimable: 0,
  roundOff: 0,
  payable: 0,
  lines: [],
  charges: [],
  ...overrides,
});
const freight = { ledger: 'Freight Inward', group: 'Direct Expenses' };

describe('bill postings', () => {
  it('books a goods bill with freight to purchase, the head and input GST', () => {
    // 10,000 goods + 500 freight at 18% in our state: 945 + 945 GST, 12,390 payable.
    const lines = billPostings(
      bill({ cgst: 945, sgst: 945, tax: 1_890, itcClaimable: 1_890, payable: 12_390, lines: [{ taxable: 10_000, ownCost: 10_000, itcEligible: true }], charges: [{ head: freight, amount: 500 }] }),
      vendor,
      ledgers,
    );
    expect(byLedger(lines)).toEqual({ 'Purchase - GST Local': 10_000, 'Freight Inward': 500, 'Input CGST': 945, 'Input SGST': 945, 'Tata Steel Ltd': -12_390 });
    expect(imbalance(lines)).toBe(0);
  });

  it('puts a 17(5) line, GST included, in Purchase - No Input Credit and claims the rest', () => {
    const lines = billPostings(
      bill({
        regime: 'INTER_STATE',
        igst: 2_700,
        tax: 2_700,
        itcClaimable: 1_800,
        roundOff: 0,
        payable: 17_700,
        lines: [
          { taxable: 10_000, ownCost: 10_000, itcEligible: true },
          { taxable: 5_000, ownCost: 5_900, itcEligible: false },
        ],
      }),
      vendor,
      ledgers,
    );
    expect(byLedger(lines)).toEqual({ 'Purchase - GST Interstate': 10_000, 'Purchase - No Input Credit': 5_900, 'Input IGST': 1_800, 'Tata Steel Ltd': -17_700 });
    expect(imbalance(lines)).toBe(0);
  });

  it('books an unregistered vendor wholly to Purchase - No Input Credit', () => {
    const lines = billPostings(bill({ regime: 'NO_GST', payable: 4_250, roundOff: 0.5, lines: [{ taxable: 4_249.5, ownCost: 4_249.5, itcEligible: false }] }), vendor, ledgers);
    expect(byLedger(lines)).toEqual({ 'Purchase - No Input Credit': 4_249.5, 'Round Off A/c': 0.5, 'Tata Steel Ltd': -4_250 });
  });

  it('books GTA freight under reverse charge: vendor gets the value, the GST is ours to pay', () => {
    const lines = billPostings(
      bill({ regime: 'REVERSE_CHARGE', cgst: 150, sgst: 150, tax: 300, itcClaimable: 300, payable: 6_000, charges: [{ head: freight, amount: 6_000 }] }),
      { ledger: 'Siliguri Roadways', group: 'Sundry Creditors' },
      ledgers,
    );
    expect(byLedger(lines)).toEqual({
      'Freight Inward': 6_000,
      'Input CGST': 150,
      'Input SGST': 150,
      'Siliguri Roadways': -6_000,
      'CGST Payable on RCM': -150,
      'SGST Payable on RCM': -150,
    });
    expect(imbalance(lines)).toBe(0);
  });

  it('puts several charges under one head on one line', () => {
    const lines = billPostings(
      bill({ payable: 700, charges: [{ head: freight, amount: 400 }, { head: { ...freight, ledger: 'freight inward' }, amount: 300 }] }),
      vendor,
      ledgers,
    );
    expect(lines.filter((line) => line.ledger.toLowerCase() === 'freight inward')).toEqual([{ ledger: 'Freight Inward', group: 'Direct Expenses', debit: 700, credit: 0 }]);
  });
});

describe('settlement postings', () => {
  it('books a receipt with TDS deducted by the customer', () => {
    const lines = settlementPostings({ direction: 'RECEIPT', amount: 98_000, tds: 2_000 }, customer, bank, ledgers);
    expect(byLedger(lines)).toEqual({ 'SBI Current': 98_000, 'TDS Receivable': 2_000, 'Dorji Traders': -1_00_000 });
  });

  it('books a payment with TDS we deducted', () => {
    const lines = settlementPostings({ direction: 'PAYMENT', amount: 49_500, tds: 500 }, vendor, bank, ledgers);
    expect(byLedger(lines)).toEqual({ 'Tata Steel Ltd': 50_000, 'SBI Current': -49_500, 'TDS Payable on Vendor Payments': -500 });
  });

  it('leaves TDS out when there is none', () => {
    expect(settlementPostings({ direction: 'PAYMENT', amount: 6_000, tds: 0 }, vendor, bank, ledgers)).toHaveLength(2);
  });

  // A refund is an entry of the other direction (Tally: Payment / Receipt voucher Agst Ref the advance).
  it('books a refund of a customer advance as a payment voucher: Dr customer, Cr bank', () => {
    const lines = settlementPostings({ direction: 'PAYMENT', amount: 15_000, tds: 0 }, customer, bank, ledgers);
    expect(byLedger(lines)).toEqual({ 'Dorji Traders': 15_000, 'SBI Current': -15_000 });
  });

  it('books a vendor refunding our advance as a receipt voucher: Dr bank, Cr vendor', () => {
    const lines = settlementPostings({ direction: 'RECEIPT', amount: 4_000, tds: 0 }, vendor, bank, ledgers);
    expect(byLedger(lines)).toEqual({ 'SBI Current': 4_000, 'Tata Steel Ltd': -4_000 });
  });
});

describe('closing stock', () => {
  it('is opening plus purchased plus adjusted less sold', () => {
    expect(closingStock({ opening: 50_000, purchased: 12_340.5, adjusted: -1_260, sold: 30_000.25 })).toBe(31_080.25);
  });
});

describe('expense postings', () => {
  const rent = { ledger: 'Rent', group: 'Indirect Expenses' };

  it('books a paid expense to its head and input GST against the bank', () => {
    const lines = expensePostings({ cgst: 1_620, sgst: 1_620, igst: 0, itcEligible: true, total: 21_240, cost: 18_000 }, rent, bank, ledgers);
    expect(byLedger(lines)).toEqual({ Rent: 18_000, 'Input CGST': 1_620, 'Input SGST': 1_620, 'SBI Current': -21_240 });
    expect(imbalance(lines)).toBe(0);
  });

  it('books an expense on credit against the vendor, blocked GST on the head', () => {
    const lines = expensePostings({ cgst: 0, sgst: 0, igst: 360, itcEligible: false, total: 2_360, cost: 2_360 }, rent, vendor, ledgers);
    expect(byLedger(lines)).toEqual({ Rent: 2_360, 'Tata Steel Ltd': -2_360 });
  });
});
