// Vendor bill arithmetic: which GST applies, the totals, and the landed cost
// spread over a goods bill's lines. Pure. The frontend shows the same live
// in features/purchases/purchase-rules.ts; the figures stored come from here.
//
// GST is never picked (27 Oct 2026 walkthrough, gst-rules on the frontend):
// a goods transport agency → reverse charge (we pay, then claim it back);
// composition or unregistered vendor → no GST, nothing to claim; overseas →
// IGST at customs; otherwise CGST + SGST in our state, IGST from another.
// Freight and loading printed on a goods bill take the rate of the bill's
// largest line. GST we cannot claim (17(5), composition, unregistered) is
// part of what the goods cost.
import { sumTax, taxOn, type TaxAmounts, type TaxSplit } from '../common/gst/tax-split.js';
import type { GstTreatment, LandedCostMethod, PurchaseRegime } from '../generated/prisma/enums.js';

export const money = (value: number) => Math.round(value * 100) / 100;
const rate4 = (value: number) => Math.round(value * 10_000) / 10_000;

/** GST on freight by a goods transport agency under reverse charge. */
export const GTA_RCM_RATE = 5;
/** MSMED Act s.15: a micro or small vendor must be paid within 45 days. */
export const MSME_PAYMENT_DAYS = 45;
/** GST rates a charges bill may print. */
export const CHARGE_RATES = [5, 12, 18, 28, 40];

export interface VendorTaxFacts {
  treatment: GstTreatment;
  placeOfSupply: string | null;
  isGta: boolean;
}

export interface BillTax {
  regime: PurchaseRegime;
  /** Whether the GST can be claimed back as input tax credit. */
  itc: boolean;
  /** How the rate splits on the bill: CGST + SGST, IGST, or none. */
  split: TaxSplit;
}

export function billTax(companyState: string, vendor: VendorTaxFacts, sourceOfSupply: string | null): BillTax {
  const from = sourceOfSupply ?? vendor.placeOfSupply;
  const split = from === companyState ? 'INTRA' : 'INTER';
  if (vendor.isGta) return { regime: 'REVERSE_CHARGE', itc: true, split };
  switch (vendor.treatment) {
    case 'COMPOSITION':
    case 'UNREGISTERED':
    case 'CONSUMER':
      return { regime: 'NO_GST', itc: false, split: 'NONE' };
    case 'OVERSEAS':
    case 'SEZ':
      return { regime: 'IMPORT', itc: true, split: 'INTER' };
    default:
      return split === 'INTRA' ? { regime: 'INTRA_STATE', itc: true, split } : { regime: 'INTER_STATE', itc: true, split };
  }
}

export interface BillLineInput {
  quantity: number;
  rate: number;
  discountPct: number;
  gstRatePct: number;
  itcEligible: boolean;
  /** Kilograms on the line, for spreading by weight; null when unknown. */
  weightKg: number | null;
}

export interface ChargeInput {
  amount: number;
  /** Charges bills: the rate on the vendor's bill. Goods bills ignore it (the bill's rate applies). */
  gstRatePct: number;
}

export interface LineFigures {
  taxable: number;
  tax: number;
  /** Taxable plus GST that cannot be claimed. */
  ownCost: number;
}

export interface BillFigures {
  lines: LineFigures[];
  /** The GST rate each charge took. */
  chargeRates: number[];
  chargeTaxes: number[];
  goodsValue: number;
  chargesValue: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  itcClaimable: number;
  itcLost: number;
  roundOff: number;
  payable: number;
  cost: number;
}

/** The rate freight and loading on a goods bill follow: that of the line with the largest value. */
export function billChargeRate(lines: Pick<BillLineInput, 'quantity' | 'rate' | 'gstRatePct'>[]): number {
  let principal: (typeof lines)[number] | undefined;
  for (const line of lines) {
    if (!principal || line.quantity * line.rate > principal.quantity * principal.rate) principal = line;
  }
  return principal?.gstRatePct ?? 0;
}

/**
 * The rate a charges bill's charge takes: fixed at the GTA rate under
 * reverse charge, zero without a GST bill or on a head with no GST, the
 * head's own rate, else the rate printed (one of CHARGE_RATES).
 */
export function chargeRate(tax: BillTax, head: { gst: 'FOLLOWS_BILL' | 'OWN_RATE' | 'NONE' | null; gstRatePct: number | null }, printed: number): number {
  if (tax.regime === 'REVERSE_CHARGE') return GTA_RCM_RATE;
  if (tax.regime === 'NO_GST' || head.gst === 'NONE') return 0;
  if (head.gst === 'OWN_RATE' && head.gstRatePct !== null) return head.gstRatePct;
  return printed;
}

export function billFigures(kind: 'GOODS' | 'CHARGES', lines: BillLineInput[], charges: ChargeInput[], tax: BillTax): BillFigures {
  const totals: TaxAmounts = { cgst: 0, sgst: 0, igst: 0 };
  const add = (amounts: TaxAmounts) => {
    totals.cgst = money(totals.cgst + amounts.cgst);
    totals.sgst = money(totals.sgst + amounts.sgst);
    totals.igst = money(totals.igst + amounts.igst);
  };

  let goodsValue = 0;
  let itcLost = 0;
  const lineFigures = lines.map((line) => {
    const taxable = money(line.quantity * line.rate * (1 - line.discountPct / 100));
    const amounts = taxOn(taxable, line.gstRatePct, tax.split);
    add(amounts);
    goodsValue += taxable;
    const lineTax = sumTax(amounts);
    if (!line.itcEligible) itcLost += lineTax;
    return { taxable, tax: lineTax, ownCost: money(taxable + (line.itcEligible ? 0 : lineTax)) };
  });

  const goodsRate = billChargeRate(lines);
  let chargesValue = 0;
  const chargeRates: number[] = [];
  const chargeTaxes = charges.map((charge) => {
    const taxable = money(charge.amount);
    const ratePct = kind === 'GOODS' ? goodsRate : charge.gstRatePct;
    chargeRates.push(ratePct);
    const amounts = taxOn(taxable, ratePct, tax.split);
    add(amounts);
    chargesValue += taxable;
    return sumTax(amounts);
  });

  const allTax = sumTax(totals);
  if (!tax.itc) itcLost = allTax;
  const taxable = money(goodsValue + chargesValue);
  const reverseCharge = tax.regime === 'REVERSE_CHARGE';
  const exact = money(taxable + (reverseCharge ? 0 : allTax));
  const payable = Math.round(exact);
  return {
    lines: lineFigures,
    chargeRates,
    chargeTaxes,
    goodsValue: money(goodsValue),
    chargesValue: money(chargesValue),
    taxable,
    ...totals,
    tax: allTax,
    itcClaimable: money(allTax - itcLost),
    itcLost: money(itcLost),
    roundOff: money(payable - exact),
    payable,
    cost: money(taxable + itcLost),
  };
}

export interface LandedRow {
  landedShare: number;
  landedCost: number;
  /** Per base unit, to 4 decimals: what stock is valued at. */
  landedRate: number;
}

/**
 * Spreads `charges` over the lines in proportion to value, quantity or
 * weight; the last line takes the rounding so the shares add up. Null when
 * spreading by weight and a line's weight is unknown.
 */
export function allocateLandedCost(
  lines: (Pick<BillLineInput, 'quantity' | 'weightKg'> & Pick<LineFigures, 'taxable' | 'ownCost'>)[],
  charges: number,
  method: LandedCostMethod,
): LandedRow[] | null {
  const bases = lines.map((line) => (method === 'VALUE' ? line.taxable : method === 'QUANTITY' ? line.quantity : line.weightKg));
  if (bases.some((basis) => basis === null)) return null;
  const total = bases.reduce<number>((sum, basis) => sum + (basis ?? 0), 0);
  let given = 0;
  return lines.map((line, index) => {
    const basis = bases[index] ?? 0;
    const landedShare = index === lines.length - 1 ? money(charges - given) : total ? money((charges * basis) / total) : 0;
    given = money(given + landedShare);
    const landedCost = money(line.ownCost + landedShare);
    return { landedShare, landedCost, landedRate: line.quantity ? rate4(landedCost / line.quantity) : 0 };
  });
}

/** Kilograms on a line: from a kg or ton unit, else from the item's weight per unit. */
export function lineWeightKg(quantity: number, unit: string, itemWeightKg: number | null): number | null {
  if (unit === 'kg') return quantity;
  if (unit === 'ton') return quantity * 1000;
  return itemWeightKg === null ? null : quantity * itemWeightKg;
}

/** Due date from the vendor's credit days, capped at 45 days for MSME vendors. */
export function billDueDays(vendor: { creditDays: number; udyamNumber: string | null }): number {
  return vendor.udyamNumber ? Math.min(vendor.creditDays, MSME_PAYMENT_DAYS) : vendor.creditDays;
}

/** What an order line has left to come: ordered less what non-void bills received, never below 0. */
export const pendingQuantity = (ordered: number, received: number) => Math.max(0, Math.round((ordered - received) * 1000) / 1000);
