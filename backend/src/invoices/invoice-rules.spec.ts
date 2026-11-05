import { describe, expect, it } from 'vitest';
import { conversionProblem, kindProblem, quantityOut, SERIES_OF } from './invoice-rules.js';

describe('kindProblem', () => {
  it('keeps exports for buyers abroad and local invoices for India', () => {
    expect(kindProblem('EXPORT', 'OVERSEAS')).toBeNull();
    expect(kindProblem('EXPORT', 'SEZ')).toBeNull();
    expect(kindProblem('EXPORT', 'REGISTERED')).toMatch(/local invoice/);
    expect(kindProblem('LOCAL', 'REGISTERED')).toBeNull();
    expect(kindProblem('LOCAL', 'CONSUMER')).toBeNull();
    expect(kindProblem('LOCAL', 'OVERSEAS')).toMatch(/export invoice/);
  });
  it('numbers each kind from its own series', () => {
    expect(SERIES_OF).toEqual({ LOCAL: 'SALES_INVOICE', EXPORT: 'EXPORT_INVOICE' });
  });
});

describe('conversionProblem', () => {
  it('invoices a sent or accepted quotation once', () => {
    expect(conversionProblem('SENT')).toBeNull();
    expect(conversionProblem('ACCEPTED')).toBeNull();
    expect(conversionProblem('CONVERTED')).toMatch(/already invoiced/);
    expect(conversionProblem('DRAFT')).toMatch(/draft/);
    expect(conversionProblem('CANCELLED')).toMatch(/cancelled/);
    expect(conversionProblem('REJECTED')).toMatch(/rejected/);
  });
});

describe('quantityOut', () => {
  it('sends the free units out of stock too', () => {
    expect(quantityOut({ quantity: 100, freeQuantity: 10 })).toBe(110);
    expect(quantityOut({ quantity: 0.1, freeQuantity: 0.2 })).toBe(0.3);
  });
});
