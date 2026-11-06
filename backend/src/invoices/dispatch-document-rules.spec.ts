import { describe, expect, it } from 'vitest';
import { cleanDetails, cleanNumber, documentDateProblem, documentKindProblem, nameInText, needsEinvoice } from './dispatch-document-rules.js';

const IRN = 'A'.repeat(32) + '0123456789abcdef0123456789abcdef';

describe('documentKindProblem', () => {
  it('keeps customs and payment papers for exports', () => {
    expect(documentKindProblem('SHIPPING_BILL', 'EXPORT', 'OVERSEAS')).toBeNull();
    expect(documentKindProblem('BRC', 'LOCAL', 'REGISTERED')).toMatch(/export invoices only/);
    expect(documentKindProblem('EWAY_BILL', 'LOCAL', 'CONSUMER')).toBeNull();
    expect(documentKindProblem('LORRY_CHALLAN', 'LOCAL', 'UNREGISTERED')).toBeNull();
  });
  it('gives an IRN to B2B and exports only', () => {
    expect(needsEinvoice('EXPORT', 'OVERSEAS')).toBe(true);
    expect(needsEinvoice('LOCAL', 'SEZ')).toBe(true);
    expect(needsEinvoice('LOCAL', 'COMPOSITION')).toBe(true);
    expect(documentKindProblem('E_INVOICE', 'LOCAL', 'REGISTERED')).toBeNull();
    expect(documentKindProblem('E_INVOICE', 'LOCAL', 'CONSUMER')).toMatch(/no IRN/);
    expect(documentKindProblem('E_INVOICE', 'LOCAL', 'UNREGISTERED')).toMatch(/no IRN/);
  });
});

describe('cleanNumber', () => {
  it('stores the IRN in lower case and checks fixed formats', () => {
    expect(cleanNumber('E_INVOICE', ` ${IRN} `)).toEqual({ number: IRN.toLowerCase() });
    expect(cleanNumber('E_INVOICE', 'abc')).toEqual({ problem: expect.stringMatching(/64/) as string });
    expect(cleanNumber('EWAY_BILL', '123456789012')).toEqual({ number: '123456789012' });
    expect(cleanNumber('EWAY_BILL', '12345')).toEqual({ problem: expect.stringMatching(/12 digits/) as string });
    expect(cleanNumber('SHIPPING_BILL', '1234567')).toEqual({ number: '1234567' });
    expect(cleanNumber('LEO', '  ')).toEqual({ problem: 'Enter the document number' });
    expect(cleanNumber('LORRY_CHALLAN', 'LR/77')).toEqual({ number: 'LR/77' });
  });
});

describe('cleanDetails', () => {
  it('turns amounts into numbers, upper-cases codes and drops blanks', () => {
    expect(cleanDetails('LORRY_CHALLAN', { transporter: ' Royal Transport ', vehicle: 'wb73e1234', freight: '8500.50' })).toEqual({
      details: { transporter: 'Royal Transport', vehicle: 'WB73E1234', freight: 8500.5 },
    });
    expect(cleanDetails('PACKING_LIST', { packages: '', grossKg: 2600.125 })).toEqual({ details: { grossKg: 2600.125 } });
    expect(cleanDetails('SHIPPING_BILL', { portCode: 'injigb' })).toEqual({ details: { portCode: 'INJIGB' } });
  });
  it('refuses bad values and fields the kind does not have', () => {
    expect(cleanDetails('LORRY_CHALLAN', { vehicle: 'WB 73 E 1234' })).toEqual({ problem: expect.stringMatching(/WB73E1234/) as string });
    expect(cleanDetails('E_INVOICE', { ackNo: '12' })).toEqual({ problem: expect.stringMatching(/15 digits/) as string });
    expect(cleanDetails('LEO', { amount: '5' })).toEqual({ problem: expect.stringMatching(/no field "amount"/) as string });
    expect(cleanDetails('BRC', { amount: '-5' })).toEqual({ problem: expect.stringMatching(/amount/) as string });
    expect(cleanDetails('BRC', { bank: { name: 'x' } })).toEqual({ problem: expect.stringMatching(/bank/) as string });
  });
});

describe('documentDateProblem', () => {
  it('dates a paper between its invoice and today', () => {
    expect(documentDateProblem({ date: '2026-11-06', details: {} }, '2026-11-06', '2026-11-07')).toBeNull();
    expect(documentDateProblem({ date: '2026-11-05', details: {} }, '2026-11-06', '2026-11-07')).toMatch(/before the invoice/);
    expect(documentDateProblem({ date: '2026-11-08', details: {} }, '2026-11-06', '2026-11-07')).toMatch(/after today/);
  });
  it('keeps an e-way bill valid until on or after its date', () => {
    expect(documentDateProblem({ date: '2026-11-06', details: { validUntil: '2026-11-08' } }, '2026-11-06', '2026-11-07')).toBeNull();
    expect(documentDateProblem({ date: '2026-11-06', details: { validUntil: '2026-11-05' } }, '2026-11-06', '2026-11-07')).toMatch(/Valid until/);
  });
});

describe('nameInText', () => {
  it('lower-cases a name but keeps abbreviations', () => {
    expect(nameInText('EWAY_BILL')).toBe('e-way bill');
    expect(nameInText('E_INVOICE')).toBe('e-invoice (IRN)');
    expect(nameInText('LEO')).toBe('LEO');
    expect(nameInText('BRC')).toBe('BRC / e-BRC');
  });
});
