import { describe, expect, it } from 'vitest';
import { holdsTruck, paperCells, requiredPapers } from './document-register-rules.js';

const exportBig = { kind: 'EXPORT', treatment: 'OVERSEAS', total: 1_20_000 } as const;
const exportSmall = { kind: 'EXPORT', treatment: 'OVERSEAS', total: 40_000 } as const;

describe('papers an invoice must carry', () => {
  it('asks an export for every paper to clear customs, then the BRC', () => {
    expect(requiredPapers(exportBig)).toEqual([
      { kind: 'E_INVOICE', neededBy: 'IN_TRANSIT' },
      { kind: 'LORRY_CHALLAN', neededBy: 'IN_TRANSIT' },
      { kind: 'EWAY_BILL', neededBy: 'IN_TRANSIT' },
      { kind: 'CUSTOMS_INVOICE', neededBy: 'AT_BORDER' },
      { kind: 'PACKING_LIST', neededBy: 'AT_BORDER' },
      { kind: 'SHIPPING_BILL', neededBy: 'AT_BORDER' },
      { kind: 'LEO', neededBy: 'CLEARED' },
      { kind: 'BRC', neededBy: 'PAYMENT' },
    ]);
  });
  it('drops the e-way bill at or under ₹50,000', () => {
    expect(requiredPapers(exportSmall).map((paper) => paper.kind)).not.toContain('EWAY_BILL');
    expect(requiredPapers({ kind: 'LOCAL', treatment: 'REGISTERED', total: 50_000 })).toEqual([{ kind: 'E_INVOICE', neededBy: 'IN_TRANSIT' }]);
  });
  it('asks a consumer sale only for the e-way bill above the limit', () => {
    expect(requiredPapers({ kind: 'LOCAL', treatment: 'CONSUMER', total: 30_000 })).toEqual([]);
    expect(requiredPapers({ kind: 'LOCAL', treatment: 'UNREGISTERED', total: 80_000 })).toEqual([{ kind: 'EWAY_BILL', neededBy: 'IN_TRANSIT' }]);
  });
});

describe('a missing paper holding its truck', () => {
  it('holds when the next stage or an earlier one needs it', () => {
    expect(holdsTruck('IN_TRANSIT', 'LOADING')).toBe(true);
    expect(holdsTruck('AT_BORDER', 'LOADING')).toBe(false);
    expect(holdsTruck('AT_BORDER', 'IN_TRANSIT')).toBe(true);
    expect(holdsTruck('CLEARED', 'AT_BORDER')).toBe(true);
  });
  it('never holds for the BRC, off a truck, or once delivered', () => {
    expect(holdsTruck('PAYMENT', 'CLEARED')).toBe(false);
    expect(holdsTruck('IN_TRANSIT', null)).toBe(false);
    expect(holdsTruck('CLEARED', 'DELIVERED')).toBe(false);
  });
});

describe('paper cells', () => {
  it('shows attached, missing and optional papers in order', () => {
    const cells = paperCells(exportSmall, [{ kind: 'E_INVOICE', number: 'a'.repeat(64), date: '2026-11-05' }], 'LOADING');
    expect(cells.map((cell) => cell.kind)).toEqual(['E_INVOICE', 'LORRY_CHALLAN', 'EWAY_BILL', 'CUSTOMS_INVOICE', 'PACKING_LIST', 'SHIPPING_BILL', 'LEO', 'BRC']);
    expect(cells[0]).toMatchObject({ state: 'ATTACHED' });
    expect(cells[1]).toEqual({ kind: 'LORRY_CHALLAN', state: 'MISSING', neededBy: 'IN_TRANSIT', holdsTruck: true });
    expect(cells[2]).toEqual({ kind: 'EWAY_BILL', state: 'OPTIONAL' });
    expect(cells[3]).toMatchObject({ state: 'MISSING', holdsTruck: false });
  });
  it('gives a consumer sale no IRN or customs cells', () => {
    const cells = paperCells({ kind: 'LOCAL', treatment: 'CONSUMER', total: 10_000 }, [], null);
    expect(cells).toEqual([
      { kind: 'LORRY_CHALLAN', state: 'OPTIONAL' },
      { kind: 'EWAY_BILL', state: 'OPTIONAL' },
    ]);
  });
});
