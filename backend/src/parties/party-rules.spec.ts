import { describe, expect, it } from 'vitest';
import { gstinCheckChar } from '../common/gst/gstin.js';
import { partyProblem, settleParty, type PartyFacts } from './party-rules.js';

// A West Bengal GSTIN with a correct check character.
const first14 = '19ABCDE1234F1Z';
const GSTIN = first14 + gstinCheckChar(first14);

const base: PartyFacts = {
  isCustomer: true,
  isVendor: false,
  treatment: 'REGISTERED',
  gstin: GSTIN,
  pan: null,
  placeOfSupply: null,
  country: null,
  foreignTaxId: null,
  currency: 'INR',
  exportRoute: null,
  isGta: false,
  creditLimit: null,
  openingBalanceSide: 'PAYABLE',
};

describe('settleParty', () => {
  it('fills PAN and place of supply from the GSTIN', () => {
    const party = settleParty(base);
    expect(party.pan).toBe('ABCDE1234F');
    expect(party.placeOfSupply).toBe('19');
    expect(partyProblem(party)).toBeNull();
  });

  it('sets the balance side from a single role, keeps it for both', () => {
    expect(settleParty(base).openingBalanceSide).toBe('RECEIVABLE');
    expect(
      settleParty({ ...base, isCustomer: false, isVendor: true })
        .openingBalanceSide,
    ).toBe('PAYABLE');
    expect(settleParty({ ...base, isVendor: true }).openingBalanceSide).toBe(
      'PAYABLE',
    );
  });

  it('gives an overseas customer the LUT route and clears GTA for non-vendors', () => {
    const party = settleParty({
      ...base,
      treatment: 'OVERSEAS',
      gstin: null,
      country: 'Bhutan',
      isGta: true,
    });
    expect(party.exportRoute).toBe('LUT');
    expect(party.isGta).toBe(false);
    expect(partyProblem(party)).toBeNull();
  });
});

describe('partyProblem', () => {
  const settled = settleParty(base);

  it('needs a role', () => {
    expect(partyProblem({ ...settled, isCustomer: false })).toBe(
      'Pick customer, vendor or both',
    );
  });

  it('checks the GSTIN check character', () => {
    const wrong = GSTIN.slice(0, 14) + (GSTIN[14] === 'A' ? 'B' : 'A');
    expect(partyProblem({ ...settled, gstin: wrong })).toMatch(
      /last character/,
    );
  });

  it('rejects a place of supply other than the GSTIN state', () => {
    expect(partyProblem({ ...settled, placeOfSupply: '18' })).toMatch(
      /does not match the state/,
    );
  });

  it('rejects a PAN that is not inside the GSTIN', () => {
    expect(partyProblem({ ...settled, pan: 'ZZZZZ9999Z' })).toBe(
      'The PAN does not match the GSTIN',
    );
  });

  it('rejects a GSTIN on an unregistered party', () => {
    expect(partyProblem({ ...settled, treatment: 'UNREGISTERED' })).toMatch(
      /Only registered/,
    );
  });

  it('needs a country, and no place of supply, outside India', () => {
    const overseas = {
      ...settled,
      treatment: 'OVERSEAS' as const,
      gstin: null,
      pan: null,
    };
    expect(partyProblem(overseas)).toBe('Enter the country');
    expect(partyProblem({ ...overseas, country: 'Bhutan' })).toMatch(
      /no place of supply/,
    );
  });

  it('bills in BTN only outside India', () => {
    expect(partyProblem({ ...settled, currency: 'BTN' })).toMatch(/BTN/);
  });

  it('needs a known state code inside India', () => {
    const consumer = {
      ...settled,
      treatment: 'CONSUMER' as const,
      gstin: null,
    };
    expect(partyProblem({ ...consumer, placeOfSupply: null })).toBe(
      'Pick the place of supply',
    );
    expect(partyProblem({ ...consumer, placeOfSupply: '25' })).toMatch(
      /Unknown GST state code/,
    );
    expect(partyProblem({ ...consumer, placeOfSupply: '19' })).toBeNull();
  });
});
