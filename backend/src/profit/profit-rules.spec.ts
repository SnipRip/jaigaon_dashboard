import { describe, expect, it } from 'vitest';
import { shipmentProfit } from '../shipments/shipment-rules.js';
import { buildProfitReport, shareByValue, type ProfitExpense, type ProfitInvoice, type ProfitShipment } from './profit-rules.js';

const line = (itemId: string, taxable: number, costOfGoods: number) => ({ itemId, itemName: `Item ${itemId}`, sku: itemId.toUpperCase(), taxable, costOfGoods });

const exportA: ProfitInvoice = {
  id: 'a',
  number: 'EXP/2627/0001',
  date: '2026-11-02',
  partyId: 'druk',
  partyName: 'Druk Builders',
  taxable: 60_000,
  cost: 45_000,
  lines: [line('tmt', 40_000, 30_000), line('pipe', 20_000, 15_000)],
  shipmentId: 's1',
};
const exportB: ProfitInvoice = { ...exportA, id: 'b', number: 'EXP/2627/0002', taxable: 40_000, cost: 32_000, lines: [line('tmt', 40_000, 32_000)] };
const local: ProfitInvoice = {
  id: 'c',
  number: 'INV/2627/0001',
  date: '2026-11-03',
  partyId: 'sharma',
  partyName: 'Sharma Hardware',
  taxable: 10_000,
  cost: 8_000,
  lines: [line('pipe', 10_000, 8_000)],
  shipmentId: null,
};
const truck: ProfitShipment = {
  id: 's1',
  number: 'SHP/2627/0001',
  vehicleNumber: 'BG2A1234',
  destination: 'Thimphu',
  invoices: [
    { id: 'a', taxable: 60_000 },
    { id: 'b', taxable: 40_000 },
  ],
};
const expense = (id: string, cost: number, allocation: ProfitExpense['allocation'], target: Partial<ProfitExpense> = {}): ProfitExpense => ({
  id,
  date: '2026-11-04',
  headName: allocation === 'OVERHEAD' ? 'Rent' : 'Freight',
  cost,
  allocation,
  invoiceId: null,
  shipmentId: null,
  ...target,
});

describe('shareByValue', () => {
  it('splits by value and the last takes the rounding', () => {
    expect(shareByValue(100, [1, 1, 1])).toEqual([33.33, 33.33, 33.34]);
    expect(shareByValue(6_000, [60_000, 40_000])).toEqual([3_600, 2_400]);
  });
  it('gives nothing when there is no value to share on', () => {
    expect(shareByValue(500, [0, 0])).toEqual([0, 0]);
  });
});

describe('buildProfitReport', () => {
  const onSales = [
    expense('freight', 6_000, 'SHIPMENT', { shipmentId: 's1' }),
    expense('loading', 1_200, 'INVOICE', { invoiceId: 'c' }),
    expense('waiting', 700, 'SHIPMENT'),
  ];
  const overheads = [expense('rent', 18_000, 'OVERHEAD'), expense('power', 2_000, 'OVERHEAD', { headName: 'Electricity' })];
  const report = buildProfitReport([exportA, exportB, local], [truck], onSales, overheads);

  it('shares a truck’s expenses over its invoices by value', () => {
    expect(report.byInvoice.map((row) => [row.label, row.expenses, row.profit])).toEqual([
      ['EXP/2627/0001', 3_600, 11_400],
      ['EXP/2627/0002', 2_400, 5_600],
      ['INV/2627/0001', 1_200, 800],
    ]);
  });

  it('gives a shipment the same figure as the shipment page when all its invoices are in the period', () => {
    const row = report.byShipment.find((candidate) => candidate.key === 's1');
    expect(row).toMatchObject(shipmentProfit([exportA, exportB], [6_000]));
    expect(row?.detail).toBe('BG2A1234 to Thimphu');
  });

  it('adds up to the same total in every view', () => {
    for (const rows of [report.byInvoice, report.byShipment, report.byCustomer, report.byItem]) {
      expect(rows.reduce((sum, row) => sum + row.profit, 0)).toBeCloseTo(report.total.profit, 2);
      expect(rows.reduce((sum, row) => sum + row.expenses, 0)).toBeCloseTo(report.total.expenses, 2);
    }
    expect(report.total).toMatchObject({ sales: 110_000, cost: 85_000, expenses: 7_200, profit: 17_800 });
    expect(report.byShipment.at(-1)).toMatchObject({ key: 'none', sales: 10_000 });
  });

  it('spreads an invoice’s expenses over its lines by value', () => {
    const tmt = report.byItem.find((row) => row.key === 'tmt');
    // EXP 0001: 3,600 × 40/60 = 2,400; EXP 0002: 2,400.
    expect(tmt).toMatchObject({ sales: 80_000, cost: 62_000, expenses: 4_800, profit: 13_200 });
  });

  it('takes overheads and unlinked shipment expenses off for net profit', () => {
    expect(report.overheads.total).toBe(20_000);
    expect(report.overheads.byHead).toEqual([
      { head: 'Rent', amount: 18_000, count: 1 },
      { head: 'Electricity', amount: 2_000, count: 1 },
    ]);
    expect(report.unassigned).toEqual({ total: 700, count: 1 });
    expect(report.netProfit).toBe(17_800 - 20_000 - 700);
  });

  it('notes a truck only partly in the period and counts only that part', () => {
    const partial = buildProfitReport([exportA], [truck], [onSales[0]!], []);
    expect(partial.byShipment[0]).toMatchObject({ sales: 60_000, expenses: 3_600 });
    expect(partial.byShipment[0]?.detail).toContain('1 of 2 invoices in this period');
  });

  it('counts nothing for an empty period', () => {
    const empty = buildProfitReport([], [], [], []);
    expect(empty.total).toEqual({ sales: 0, cost: 0, expenses: 0, profit: 0, marginPct: 0 });
    expect(empty.byShipment).toEqual([]);
  });
});
