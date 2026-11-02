// Which rate a customer gets for an item (SOW 3 and 4), in this order: a
// special rate in force for that customer, else their price level off MRP,
// else the item's selling price. A quantity slab then takes its extra
// discount, and nothing goes below the item's minimum selling price. The
// frontend applies the same order in features/rates/rate-rules.ts.
//
// A special rate, slab or level discount can be for one item or a whole
// category / sub-category. The most specific one wins: item, then
// sub-category, then category.
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
  sellingPrice: number;
  minSellingPrice: number | null;
}

export interface LevelFacts {
  id: string;
  name: string;
  discountPct: number;
  isArchived: boolean;
  categoryDiscounts: { categoryId: string; discountPct: number }[];
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

export interface SlabFacts extends RateTarget {
  id: string;
  minQuantity: number;
  discountPct: number;
  isArchived: boolean;
}

export type RateSource = 'special' | 'price-level' | 'standard' | 'minimum';

export interface RateQuote {
  rate: number;
  source: RateSource;
  special?: SpecialRateFacts;
  level?: { id: string; name: string; discountPct: number };
  slab?: SlabFacts;
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

/** A level's discount for the item: its sub-category's, else its category's, else the level's own. */
export function levelDiscountFor(level: LevelFacts, item: PricedItem): number {
  const forCategory = (id: string | null) =>
    id
      ? level.categoryDiscounts.find((row) => row.categoryId === id)
          ?.discountPct
      : undefined;
  return (
    forCategory(item.subCategoryId) ??
    forCategory(item.categoryId) ??
    level.discountPct
  );
}

export function resolveRate(
  item: PricedItem,
  customer: { id: string; level?: LevelFacts } | undefined,
  quantity: number,
  date: string,
  book: { specialRates: SpecialRateFacts[]; slabs: SlabFacts[] },
): RateQuote {
  const special = customer
    ? mostSpecific(
        book.specialRates.filter(
          (rate) => rate.partyId === customer.id && inForce(rate, date),
        ),
        item,
      )[0]
    : undefined;
  const level =
    customer?.level && !customer.level.isArchived ? customer.level : undefined;

  let rate = item.sellingPrice;
  let source: RateSource = 'standard';
  let levelApplied: RateQuote['level'];
  if (special) {
    rate =
      special.kind === 'NET'
        ? special.value
        : (item.mrp ?? item.sellingPrice) * (1 - special.value / 100);
    source = 'special';
  } else if (level && item.mrp) {
    const discountPct = levelDiscountFor(level, item);
    rate = item.mrp * (1 - discountPct / 100);
    source = 'price-level';
    levelApplied = { id: level.id, name: level.name, discountPct };
  }

  // The largest slab reached, among the most specific ones that fit.
  const slab = mostSpecific(
    book.slabs.filter(
      (candidate) => !candidate.isArchived && quantity >= candidate.minQuantity,
    ),
    item,
  ).sort((a, b) => b.minQuantity - a.minQuantity)[0];
  if (slab) rate *= 1 - slab.discountPct / 100;

  if (item.minSellingPrice !== null && rate < item.minSellingPrice) {
    rate = item.minSellingPrice;
    source = 'minimum';
  }
  return { rate: money(rate), source, special, level: levelApplied, slab };
}

// ---------------------------------------------------------------------------
// Checks before a save. Each returns null when the record is fine, else the
// first problem in words a person can act on.
// ---------------------------------------------------------------------------

/** A level may give nothing off (Retail); it can never give the item away. */
export function levelDiscountProblem(discountPct: number): string | null {
  return discountPct >= 0 && discountPct < 100
    ? null
    : 'A price level discount is from 0 to under 100%';
}

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

export function slabProblem(
  slab: Pick<SlabFacts, 'minQuantity' | 'discountPct'> & RateTarget,
): string | null {
  const target = targetProblem(slab);
  if (target) return target;
  if (slab.minQuantity <= 0) return 'A slab starts above 0';
  if (slab.discountPct <= 0 || slab.discountPct >= 100)
    return 'A slab discount is more than 0 and under 100%';
  return null;
}

/** Two live slabs from the same quantity on the same target would be ambiguous. */
export function duplicateSlab<T extends SlabFacts>(
  slab: Omit<SlabFacts, 'id' | 'isArchived' | 'discountPct'> & { id?: string },
  others: T[],
): T | undefined {
  return others.find(
    (other) =>
      other.id !== slab.id &&
      !other.isArchived &&
      sameTarget(other, slab) &&
      other.minQuantity === slab.minQuantity,
  );
}
