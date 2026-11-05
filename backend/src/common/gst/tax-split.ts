// GST on a value at a rate, split the way the document is charged: CGST +
// SGST inside our state, IGST across states (and on imports and exports
// with IGST paid), none otherwise. Shared by purchases and sales.

export type TaxSplit = 'INTRA' | 'INTER' | 'NONE';

export interface TaxAmounts {
  cgst: number;
  sgst: number;
  igst: number;
}

const money = (value: number) => Math.round(value * 100) / 100;

export function taxOn(taxable: number, ratePct: number, split: TaxSplit): TaxAmounts {
  if (split === 'NONE') return { cgst: 0, sgst: 0, igst: 0 };
  if (split === 'INTER') return { cgst: 0, sgst: 0, igst: money((taxable * ratePct) / 100) };
  const half = money((taxable * ratePct) / 2 / 100);
  return { cgst: half, sgst: half, igst: 0 };
}

export const sumTax = (tax: TaxAmounts) => money(tax.cgst + tax.sgst + tax.igst);
