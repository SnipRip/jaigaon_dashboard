// Which rate a customer gets for an item (client, 4 Nov 2026), in order: a
// special rate in force for that customer; else the rate-sheet price in force
// on the date (src/price-list); else none, and the user types the rate. The
// item master has no selling price: rates change every day. The frontend
// applies the same order in features/rates/rate-rules.ts.
//
// A special rate can be for one item or a whole category / sub-category. The
// most specific one wins: item, then sub-category, then category.
import type { SpecialRateKind } from '../generated/prisma/enums.js';

/** What a rate is set on: one item or one category, never both. */
export interface RateTarget {
  itemId: string | null;
  categoryId: string | null;
}

export interface PricedItem {
  id: string;
  categoryId: string;
  subCategoryId: string | null;
  mrp: number | null;
}

export interface SpecialRateFacts extends RateTarget {
  id: string;
  partyId: string;
  kind: SpecialRateKind;
  value: number;
  /** YYYY-MM-DD. */
  validFrom: string;
  /** YYYY-MM-DD; null runs until withdrawn. */
  validTill: string | null;
  isArchived: boolean;
}

export type RateSource = 'special' | 'price-list';

/** The rate-sheet entry in force, with its MRP filled from the item. */
export interface ListedPrice {
  id: string;
  validFrom: string;
  validTill: string;
  sellingPrice: number;
  mrp: number | null;
  minSellingPrice: number | null;
}

export interface RateQuote {
  /** Null: no special rate and no rate-sheet price; the user types one. */
  rate: number | null;
  source: RateSource | null;
  special?: SpecialRateFacts;
  /** The day's rate-sheet entry, whenever one was in force (even if a special rate won). */
  priceList?: Pick<ListedPrice, 'id' | 'validFrom' | 'validTill' | 'sellingPrice'>;
}

const money = (value: number) => Math.round(value * 100) / 100;

/** How closely a target fits the item: 0 item, 1 sub-category, 2 category; undefined when it does not. */
export function targetRank(
  target: RateTarget,
  item: PricedItem,
): number | undefined {
  if (target.itemId) return target.itemId === item.id ? 0 : undefined;
  if (!target.categoryId) return undefined;
  if (target.categoryId === item.subCategoryId) return 1;
  if (target.categoryId === item.categoryId) return 2;
  return undefined;
}

/** The entries that fit the item, keeping only the most specific rank. */
function mostSpecific<T extends RateTarget>(
  entries: T[],
  item: PricedItem,
): T[] {
  const ranked = entries
    .map((entry) => ({ entry, rank: targetRank(entry, item) }))
    .filter((row): row is { entry: T; rank: number } => row.rank !== undefined);
  const best = Math.min(...ranked.map((row) => row.rank));
  return ranked.filter((row) => row.rank === best).map((row) => row.entry);
}

export const inForce = (
  rate: Pick<SpecialRateFacts, 'validFrom' | 'validTill' | 'isArchived'>,
  date: string,
) =>
  !rate.isArchived &&
  rate.validFrom <= date &&
  (rate.validTill === null || rate.validTill >= date);

/**
 * A DISCOUNT special rate is taken off the day's rate-sheet price, else off
 * MRP; with neither it cannot give a rate and the rate sheet decides.
 */
export function resolveRate(
  item: PricedItem,
  partyId: string | undefined,
  date: string,
  specialRates: SpecialRateFacts[],
  listed?: ListedPrice,
): RateQuote {
  const special = partyId
    ? mostSpecific(
        specialRates.filter(
          (rate) => rate.partyId === partyId && inForce(rate, date),
        ),
        item,
      )[0]
    : undefined;
  const priceList = listed && {
    id: listed.id,
    validFrom: listed.validFrom,
    validTill: listed.validTill,
    sellingPrice: listed.sellingPrice,
  };
  if (special) {
    const base = listed?.sellingPrice ?? item.mrp;
    if (special.kind === 'NET')
      return { rate: special.value, source: 'special', special, priceList };
    if (base !== null)
      return {
        rate: money(base * (1 - special.value / 100)),
        source: 'special',
        special,
        priceList,
      };
  }
  return listed
    ? { rate: listed.sellingPrice, source: 'price-list', priceList }
    : { rate: null, source: null };
}

// ---------------------------------------------------------------------------
// Checks before a save. Each returns null when the record is fine, else the
// first problem in words a person can act on.
// ---------------------------------------------------------------------------

export function targetProblem(target: RateTarget): string | null {
  if (target.itemId && target.categoryId)
    return 'Pick an item or a category, not both';
  if (!target.itemId && !target.categoryId) return 'Pick the item or category';
  return null;
}

export function specialRateProblem(
  rate: Pick<SpecialRateFacts, 'kind' | 'value' | 'validFrom' | 'validTill'> &
    RateTarget,
): string | null {
  const target = targetProblem(rate);
  if (target) return target;
  if (rate.kind === 'NET' && rate.value <= 0)
    return 'A net rate is more than ₹0';
  if (rate.kind === 'DISCOUNT' && (rate.value <= 0 || rate.value >= 100)) {
    return 'A discount is more than 0 and under 100%';
  }
  if (rate.validTill !== null && rate.validTill < rate.validFrom) {
    return 'Valid till is before valid from';
  }
  return null;
}

/** Only a customer gets special rates, and not one that is archived. */
export function specialRatePartyProblem(party: {
  isCustomer: boolean;
  isArchived: boolean;
}): string | null {
  if (!party.isCustomer) return 'Special rates are for customers only';
  if (party.isArchived) return 'This customer is archived';
  return null;
}

const sameTarget = (a: RateTarget, b: RateTarget) =>
  a.itemId ? a.itemId === b.itemId : a.categoryId === b.categoryId;

/** Two date ranges share a day; an open end runs for ever. */
export const rangesOverlap = (
  a: Pick<SpecialRateFacts, 'validFrom' | 'validTill'>,
  b: Pick<SpecialRateFacts, 'validFrom' | 'validTill'>,
) =>
  (a.validTill === null || b.validFrom <= a.validTill) &&
  (b.validTill === null || a.validFrom <= b.validTill);

/**
 * Another live rate for the same customer and item (or category) whose
 * dates overlap: two rates on one day would leave the rate in doubt.
 */
export function overlappingRate<T extends SpecialRateFacts>(
  rate: Omit<SpecialRateFacts, 'id' | 'isArchived'> & { id?: string },
  others: T[],
): T | undefined {
  return others.find(
    (other) =>
      other.id !== rate.id &&
      !other.isArchived &&
      other.partyId === rate.partyId &&
      sameTarget(other, rate) &&
      rangesOverlap(other, rate),
  );
}
