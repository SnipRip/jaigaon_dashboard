// What schemes take off a sales document (client, 5 Nov 2026: schemes and
// discounts for customers, on certain items or rates, % with a maximum
// amount, and more). Pure: the service loads the schemes and the lines, and
// quotations and invoices store what this returns.
//
// Order of work, per document:
// 1. LINE schemes, each line on its own. A line is eligible when the item is
//    one the scheme targets (item, its category or sub-category, its brand;
//    no targets = every item), the line's rate kind is one the scheme
//    accepts, and it meets the minimum quantity / value.
//    Not stackable: only the one that gives most applies. Stackable ones
//    each add on. Each is capped at its maximum, and together they never
//    take a line below zero.
// 2. ORDER schemes, on the value left on the eligible lines after step 1,
//    once that reaches the minimum value. Same best-one-plus-stackable rule.
//    The discount is spread over those lines by value (the last takes the
//    rounding), so GST is charged on what the customer actually pays.
// Free quantity (buy X get Y) gives units, not rupees: it never competes
// with rupee schemes; the most generous free scheme applies.

export type SchemeLevel = 'LINE' | 'ORDER';
export type SchemeBenefit = 'PERCENT' | 'AMOUNT_PER_UNIT' | 'FLAT_AMOUNT' | 'FREE_QUANTITY';
export type SchemePartyScope = 'ALL' | 'INDIA' | 'OVERSEAS' | 'SELECTED';
export type SchemeRateSource = 'SHEET' | 'SPECIAL' | 'MANUAL';

/** Exactly one of the three. */
export interface SchemeTargetFacts {
  itemId: string | null;
  categoryId: string | null;
  brandId: string | null;
}

export interface SchemeFacts {
  id: string;
  name: string;
  level: SchemeLevel;
  benefit: SchemeBenefit;
  value: number;
  buyQuantity: number | null;
  maxDiscount: number | null;
  minQuantity: number | null;
  minValue: number | null;
  partyScope: SchemePartyScope;
  partyIds: string[];
  targets: SchemeTargetFacts[];
  rateSources: SchemeRateSource[];
  stackable: boolean;
  /** YYYY-MM-DD. */
  validFrom: string;
  validTill: string | null;
  isArchived: boolean;
}

export interface SchemeItem {
  id: string;
  categoryId: string;
  subCategoryId: string | null;
  brandId: string | null;
}

export interface SchemeParty {
  id: string;
  /** Overseas or SEZ: a buyer outside India. */
  overseas: boolean;
}

export interface SchemeLine {
  /** The caller's key for the line, returned as given. */
  key: string;
  item: SchemeItem;
  /** Base units. */
  quantity: number;
  /** Per unit, before GST. */
  rate: number;
  /** A discount typed on the line, before schemes. */
  discountPct: number;
  rateSource: SchemeRateSource;
}

export interface AppliedScheme {
  schemeId: string;
  name: string;
  level: SchemeLevel;
  /** Rupees off this line. */
  amount: number;
  freeQuantity: number;
}

export interface SchemeLineResult {
  key: string;
  /** Quantity × rate less the typed discount. */
  gross: number;
  /** Rupees all schemes take off this line. */
  schemeDiscount: number;
  /** gross − schemeDiscount: what GST is charged on. */
  taxable: number;
  freeQuantity: number;
  applied: AppliedScheme[];
}

export interface SchemeResult {
  lines: SchemeLineResult[];
  /** Every scheme that gave something, with its total over the document. */
  applied: AppliedScheme[];
  totalDiscount: number;
}

const money = (value: number) => Math.round(value * 100) / 100;
const quantity3 = (value: number) => Math.round(value * 1000) / 1000;

export const schemeInForce = (scheme: Pick<SchemeFacts, 'validFrom' | 'validTill' | 'isArchived'>, date: string) =>
  !scheme.isArchived && scheme.validFrom <= date && (scheme.validTill === null || scheme.validTill >= date);

/** Whether the scheme is for this buyer. No party is a walk-in buyer in India. */
export function schemeForParty(scheme: Pick<SchemeFacts, 'partyScope' | 'partyIds'>, party: SchemeParty | null): boolean {
  switch (scheme.partyScope) {
    case 'ALL':
      return true;
    case 'INDIA':
      return !party?.overseas;
    case 'OVERSEAS':
      return Boolean(party?.overseas);
    case 'SELECTED':
      return Boolean(party && scheme.partyIds.includes(party.id));
  }
}

export function schemeCoversItem(targets: SchemeTargetFacts[], item: SchemeItem): boolean {
  if (targets.length === 0) return true;
  return targets.some(
    (target) =>
      (target.itemId !== null && target.itemId === item.id) ||
      (target.categoryId !== null && (target.categoryId === item.categoryId || target.categoryId === item.subCategoryId)) ||
      (target.brandId !== null && target.brandId === item.brandId),
  );
}

export const lineGross = (line: Pick<SchemeLine, 'quantity' | 'rate' | 'discountPct'>) =>
  money(line.quantity * line.rate * (1 - line.discountPct / 100));

/** Rupees a scheme gives off `base` (a line's or order's value), capped; free units separately. */
function benefitOf(scheme: SchemeFacts, base: number, units: number): { amount: number; freeQuantity: number } {
  if (scheme.benefit === 'FREE_QUANTITY') {
    const sets = scheme.buyQuantity ? Math.floor(quantity3(units / scheme.buyQuantity)) : 0;
    return { amount: 0, freeQuantity: quantity3(sets * scheme.value) };
  }
  const raw =
    scheme.benefit === 'PERCENT' ? (base * scheme.value) / 100 : scheme.benefit === 'AMOUNT_PER_UNIT' ? units * scheme.value : scheme.value;
  const capped = scheme.maxDiscount === null ? raw : Math.min(raw, scheme.maxDiscount);
  return { amount: money(Math.max(0, Math.min(capped, base))), freeQuantity: 0 };
}

type Offer = { scheme: SchemeFacts; amount: number; freeQuantity: number };

/** The best of the non-stackable schemes (rupees and free units apart), plus every stackable one. */
function pick<T extends Offer>(offers: T[]): T[] {
  const given = offers.filter((offer) => offer.amount > 0 || offer.freeQuantity > 0);
  const best = (list: T[]) =>
    list.reduce<T | undefined>(
      (top, offer) => (!top || offer.amount > top.amount || (offer.amount === top.amount && offer.freeQuantity > top.freeQuantity) ? offer : top),
      undefined,
    );
  const exclusive = given.filter((offer) => !offer.scheme.stackable);
  const bestRupees = best(exclusive.filter((offer) => offer.scheme.benefit !== 'FREE_QUANTITY'));
  const bestFree = best(exclusive.filter((offer) => offer.scheme.benefit === 'FREE_QUANTITY'));
  return [bestRupees, bestFree, ...given.filter((offer) => offer.scheme.stackable)].filter((offer): offer is T => offer !== undefined);
}

export function applySchemes(schemes: SchemeFacts[], lines: SchemeLine[], party: SchemeParty | null, date: string): SchemeResult {
  const live = schemes.filter((scheme) => schemeInForce(scheme, date) && schemeForParty(scheme, party));
  const eligible = (scheme: SchemeFacts, line: SchemeLine) =>
    line.quantity > 0 && scheme.rateSources.includes(line.rateSource) && schemeCoversItem(scheme.targets, line.item);

  const results: SchemeLineResult[] = lines.map((line) => {
    const gross = lineGross(line);
    const offers = live
      .filter((scheme) => scheme.level === 'LINE' && eligible(scheme, line))
      .filter((scheme) => (scheme.minQuantity === null || line.quantity >= scheme.minQuantity) && (scheme.minValue === null || gross >= scheme.minValue))
      .map((scheme) => ({ scheme, ...benefitOf(scheme, gross, line.quantity) }));
    let left = gross;
    const applied: AppliedScheme[] = [];
    for (const offer of pick(offers)) {
      const amount = money(Math.min(offer.amount, left));
      left = money(left - amount);
      applied.push({ schemeId: offer.scheme.id, name: offer.scheme.name, level: 'LINE', amount, freeQuantity: offer.freeQuantity });
    }
    return {
      key: line.key,
      gross,
      schemeDiscount: money(gross - left),
      taxable: left,
      freeQuantity: quantity3(applied.reduce((sum, row) => sum + row.freeQuantity, 0)),
      applied,
    };
  });

  const orderOffers = live
    .filter((scheme) => scheme.level === 'ORDER')
    .map((scheme) => {
      const on = lines.flatMap((line, index) => (eligible(scheme, line) && results[index].taxable > 0 ? [index] : []));
      const base = money(on.reduce((sum, index) => sum + results[index].taxable, 0));
      const meets = on.length > 0 && (scheme.minValue === null || base >= scheme.minValue);
      return { scheme, on, ...(meets ? benefitOf(scheme, base, 0) : { amount: 0, freeQuantity: 0 }) };
    });
  for (const offer of pick(orderOffers)) {
    // Spread by the value each line still has; the last line takes the rounding.
    const base = money(offer.on.reduce((sum, index) => sum + results[index].taxable, 0));
    const amount = money(Math.min(offer.amount, base));
    let given = 0;
    offer.on.forEach((index, position) => {
      const row = results[index];
      const share = position === offer.on.length - 1 ? money(amount - given) : base ? money((amount * row.taxable) / base) : 0;
      const taken = money(Math.max(0, Math.min(share, row.taxable)));
      given = money(given + taken);
      if (taken === 0) return;
      row.taxable = money(row.taxable - taken);
      row.schemeDiscount = money(row.schemeDiscount + taken);
      row.applied.push({ schemeId: offer.scheme.id, name: offer.scheme.name, level: 'ORDER', amount: taken, freeQuantity: 0 });
    });
  }

  const totals = new Map<string, AppliedScheme>();
  for (const row of results) {
    for (const applied of row.applied) {
      const total = totals.get(applied.schemeId) ?? { ...applied, amount: 0, freeQuantity: 0 };
      total.amount = money(total.amount + applied.amount);
      total.freeQuantity = quantity3(total.freeQuantity + applied.freeQuantity);
      totals.set(applied.schemeId, total);
    }
  }
  return {
    lines: results,
    applied: [...totals.values()],
    totalDiscount: money(results.reduce((sum, row) => sum + row.schemeDiscount, 0)),
  };
}

// ---------------------------------------------------------------------------
// Checks before a save: null when fine, else the first problem in words.
// ---------------------------------------------------------------------------

export type SchemeDraft = Pick<
  SchemeFacts,
  | 'level'
  | 'benefit'
  | 'value'
  | 'buyQuantity'
  | 'maxDiscount'
  | 'minQuantity'
  | 'minValue'
  | 'partyScope'
  | 'partyIds'
  | 'targets'
  | 'rateSources'
  | 'validFrom'
  | 'validTill'
>;

export function schemeProblem(scheme: SchemeDraft): string | null {
  if (scheme.level === 'ORDER' && scheme.benefit !== 'PERCENT' && scheme.benefit !== 'FLAT_AMOUNT') {
    return 'An order scheme is a % or a flat amount off; per-unit and free-quantity schemes are for item lines';
  }
  if (scheme.value <= 0) return 'The scheme must give something: enter a value above 0';
  if (scheme.benefit === 'PERCENT' && scheme.value >= 100) return 'A % off is under 100';
  if (scheme.benefit === 'FREE_QUANTITY') {
    if (!scheme.buyQuantity || scheme.buyQuantity <= 0) return 'Enter how many to buy for the free quantity';
    if (scheme.maxDiscount !== null) return 'A free-quantity scheme has no rupee maximum';
  } else if (scheme.buyQuantity !== null) {
    return 'Buy quantity is only for a free-quantity scheme';
  }
  if (scheme.maxDiscount !== null && scheme.maxDiscount <= 0) return 'Maximum discount is above ₹0, or left empty';
  if (scheme.minQuantity !== null && scheme.minQuantity <= 0) return 'Minimum quantity is above 0, or left empty';
  if (scheme.minValue !== null && scheme.minValue <= 0) return 'Minimum value is above ₹0, or left empty';
  if (scheme.level === 'ORDER' && scheme.minQuantity !== null) return 'An order scheme has a minimum value, not a quantity';
  if (scheme.rateSources.length === 0) return 'Pick at least one kind of rate the scheme applies on';
  if (scheme.partyScope === 'SELECTED' && scheme.partyIds.length === 0) return 'Pick the customers';
  if (scheme.partyScope !== 'SELECTED' && scheme.partyIds.length > 0) return 'Customers are picked only for "Selected customers"';
  for (const target of scheme.targets) {
    if ([target.itemId, target.categoryId, target.brandId].filter((id) => id !== null).length !== 1) {
      return 'Each target is one item, category or brand';
    }
  }
  if (scheme.validTill !== null && scheme.validTill < scheme.validFrom) return 'Valid till is before valid from';
  return null;
}
