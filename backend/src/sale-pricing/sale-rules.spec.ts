import { invoiceRegime, rateSourceOf, saleRegime, schemeSourceOf } from './sale-rules.js';

const WB = '19';
const US = { stateCode: WB, registration: 'REGULAR' as const };

describe('saleRegime', () => {
  it('follows the buyer', () => {
    expect(saleRegime(US, { treatment: 'REGISTERED', placeOfSupply: WB, exportRoute: null })).toEqual({ regime: 'INTRA_STATE', split: 'INTRA', problem: null });
    expect(saleRegime(US, { treatment: 'REGISTERED', placeOfSupply: '18', exportRoute: null })).toEqual({ regime: 'INTER_STATE', split: 'INTER', problem: null });
    expect(saleRegime(US, { treatment: 'UNREGISTERED', placeOfSupply: null, exportRoute: null }).regime).toBe('INTRA_STATE');
    expect(saleRegime(US, { treatment: 'OVERSEAS', placeOfSupply: null, exportRoute: 'LUT' })).toEqual({ regime: 'EXPORT_LUT', split: 'NONE', problem: null });
    expect(saleRegime(US, { treatment: 'OVERSEAS', placeOfSupply: null, exportRoute: 'IGST' })).toEqual({ regime: 'EXPORT_IGST', split: 'INTER', problem: null });
  });
});

describe('rateSourceOf', () => {
  const offered = { special: 59.75, sheet: 61.25, lastQuoted: 60, lastSold: null };
  it('names the offered rate the line took, in the order shown', () => {
    expect(rateSourceOf(59.75, offered)).toBe('SPECIAL');
    expect(rateSourceOf(61.25, offered)).toBe('SHEET');
    expect(rateSourceOf(60, offered)).toBe('LAST_QUOTED');
    expect(rateSourceOf(60.5, offered)).toBe('MANUAL');
    // The same figure on two sources counts as the first.
    expect(rateSourceOf(61.25, { ...offered, special: 61.25 })).toBe('SPECIAL');
  });
  it('treats past documents as typed rates for schemes', () => {
    expect(schemeSourceOf('LAST_QUOTED')).toBe('MANUAL');
    expect(schemeSourceOf('SHEET')).toBe('SHEET');
  });
});

describe('invoiceRegime', () => {
  const local = { treatment: 'REGISTERED' as const, placeOfSupply: WB, exportRoute: null };
  const bhutan = { treatment: 'OVERSEAS' as const, placeOfSupply: null, exportRoute: 'LUT' as const };
  it('charges a local invoice by its own place of supply', () => {
    expect(invoiceRegime(US, 'LOCAL', local, {})).toEqual({ regime: 'INTRA_STATE', split: 'INTRA', placeOfSupply: WB, problem: null });
    // Delivered to Assam: IGST, whatever the buyer's own state.
    expect(invoiceRegime(US, 'LOCAL', local, { placeOfSupply: '18' })).toEqual({ regime: 'INTER_STATE', split: 'INTER', placeOfSupply: '18', problem: null });
    // A walk-in with no state buys here.
    expect(invoiceRegime(US, 'LOCAL', { treatment: 'CONSUMER', placeOfSupply: null, exportRoute: null }, {}).placeOfSupply).toBe(WB);
  });
  it('charges an export by its route, defaulting to the buyer', () => {
    expect(invoiceRegime(US, 'EXPORT', bhutan, {})).toEqual({ regime: 'EXPORT_LUT', split: 'NONE', placeOfSupply: null, problem: null });
    expect(invoiceRegime(US, 'EXPORT', bhutan, { exportRoute: 'IGST' })).toEqual({ regime: 'EXPORT_IGST', split: 'INTER', placeOfSupply: null, problem: null });
  });
});

describe('sales when we do not charge GST', () => {
  const local = { treatment: 'REGISTERED' as const, placeOfSupply: WB, exportRoute: null };
  const bhutan = { treatment: 'OVERSEAS' as const, placeOfSupply: null, exportRoute: 'LUT' as const };
  for (const registration of ['COMPOSITION', 'UNREGISTERED'] as const) {
    const us = { stateCode: WB, registration };
    it(`${registration}: a bill of supply inside our state`, () => {
      expect(saleRegime(us, local)).toEqual({ regime: 'BILL_OF_SUPPLY', split: 'NONE', problem: null });
    });
    it(`${registration}: no sale to another state, an SEZ or abroad`, () => {
      expect(saleRegime(us, { ...local, placeOfSupply: '18' }).problem).toMatch(/only inside its own state/);
      expect(saleRegime(us, { ...local, treatment: 'SEZ' }).problem).toMatch(/only inside its own state/);
      expect(invoiceRegime(us, 'EXPORT', bhutan, {}).problem).toMatch(/only inside its own state/);
      expect(invoiceRegime(us, 'LOCAL', local, { placeOfSupply: '18' }).problem).toMatch(/only inside its own state/);
    });
  }
});
