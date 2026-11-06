import { normaliseVehicle, VEHICLE_PATTERN } from '../common/vehicle-number.js';
import { describe, expect, it } from 'vitest';
import {
  invoiceProblem,
  invoicesLocked,
  missingFor,
  nextStage,
  papersProblem,
  shipmentProfit,
  stageDateProblem,
  type CarriedInvoice,
} from './shipment-rules.js';

const big: CarriedInvoice = { id: 'a', number: 'EXP/2627/0001', total: 1_20_000, documents: [] };
const small: CarriedInvoice = { id: 'b', number: 'EXP/2627/0002', total: 40_000, documents: [] };

describe('stages', () => {
  it('steps one at a time and stops at delivered', () => {
    expect(nextStage('PLANNED')).toBe('LOADING');
    expect(nextStage('CLEARED')).toBe('DELIVERED');
    expect(nextStage('DELIVERED')).toBeNull();
  });
  it('locks the invoices once the truck leaves the yard', () => {
    expect(invoicesLocked('LOADING')).toBe(false);
    expect(invoicesLocked('IN_TRANSIT')).toBe(true);
  });
});

describe('papers each stage needs', () => {
  it('needs nothing to plan or load', () => {
    expect(missingFor('LOADING', [big])).toEqual([]);
  });
  it('needs the IRN, challan and e-way bill to leave; no e-way bill up to ₹50,000', () => {
    expect(missingFor('IN_TRANSIT', [big]).map((row) => row.kind)).toEqual(['E_INVOICE', 'LORRY_CHALLAN', 'EWAY_BILL']);
    expect(missingFor('IN_TRANSIT', [small]).map((row) => row.kind)).toEqual(['E_INVOICE', 'LORRY_CHALLAN']);
  });
  it('carries earlier stages’ papers forward', () => {
    const ready: CarriedInvoice = { ...big, documents: ['E_INVOICE', 'LORRY_CHALLAN', 'EWAY_BILL', 'CUSTOMS_INVOICE', 'PACKING_LIST'] };
    expect(missingFor('CLEARED', [ready]).map((row) => row.kind)).toEqual(['SHIPPING_BILL', 'LEO']);
  });
  it('names each invoice in the refusal', () => {
    expect(papersProblem('IN_TRANSIT', [big, small])).toBe(
      'Before on the way, attach EXP/2627/0001: e-invoice (IRN), lorry hire challan, e-way bill; EXP/2627/0002: e-invoice (IRN), lorry hire challan',
    );
    expect(papersProblem('LOADING', [big])).toBeNull();
  });
});

describe('invoices on a truck', () => {
  const facts = { number: 'EXP/2627/0001', kind: 'EXPORT' as const, status: 'ISSUED' as const, partyId: 'p', date: '2026-11-05', onShipment: null };
  it('takes one buyer’s issued export invoices dated by loading', () => {
    expect(invoiceProblem(facts, 'p', '2026-11-06')).toBeNull();
    expect(invoiceProblem({ ...facts, kind: 'LOCAL' }, 'p', '2026-11-06')).toMatch(/local/);
    expect(invoiceProblem({ ...facts, status: 'CANCELLED' }, 'p', '2026-11-06')).toMatch(/cancelled/);
    expect(invoiceProblem(facts, 'q', '2026-11-06')).toMatch(/one buyer/);
    expect(invoiceProblem(facts, 'p', '2026-11-04')).toMatch(/after the loading/);
    expect(invoiceProblem({ ...facts, onShipment: 'SHP/2627/0001' }, 'p', '2026-11-06')).toMatch(/SHP\/2627\/0001/);
  });
});

describe('stage dates', () => {
  it('keeps stages in order and not in the future', () => {
    expect(stageDateProblem('2026-11-06', '2026-11-05', '2026-11-06')).toBeNull();
    expect(stageDateProblem('2026-11-04', '2026-11-05', '2026-11-06')).toMatch(/before/);
    expect(stageDateProblem('2026-11-07', '2026-11-05', '2026-11-06')).toMatch(/after today/);
  });
});

describe('vehicle numbers', () => {
  it('takes Indian and Bhutanese plates', () => {
    for (const plate of ['WB73E1234', 'wb 73 e 1234', 'BG2A1234', 'BP-1-A1234']) expect(normaliseVehicle(plate)).toMatch(VEHICLE_PATTERN);
    expect('HELLO').not.toMatch(VEHICLE_PATTERN);
  });
});

describe('shipmentProfit', () => {
  it('is sales before GST less FIFO cost less every expense', () => {
    expect(shipmentProfit([{ taxable: 100_000, cost: 80_000 }, { taxable: 50_000, cost: 41_000 }], [2_500, 1_200.5])).toEqual({
      sales: 150_000,
      cost: 121_000,
      expenses: 3_700.5,
      profit: 25_299.5,
      marginPct: 16.87,
    });
    expect(shipmentProfit([], []).marginPct).toBe(0);
  });
});
