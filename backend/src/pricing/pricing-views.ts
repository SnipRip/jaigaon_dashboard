// Pricing records as the API returns them: Decimals as numbers, dates as
// YYYY-MM-DD. The views also serve as the facts pricing-rules.ts reads.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type {
  PriceLevel,
  PriceLevelDiscount,
  QuantitySlab,
  SpecialRate,
} from '../generated/prisma/client.js';
import type {
  LevelFacts,
  SlabFacts,
  SpecialRateFacts,
} from './pricing-rules.js';

export interface PriceLevelView extends LevelFacts {
  description: string | null;
  /** Customers on the level, archived ones included. */
  customerCount: number;
}

export interface SpecialRateView extends SpecialRateFacts {
  notes: string | null;
}

export type QuantitySlabView = SlabFacts;

export const priceLevelInclude = {
  categoryDiscounts: true,
  _count: { select: { customers: true } },
} as const;

export const toPriceLevelView = (
  level: PriceLevel & {
    categoryDiscounts: PriceLevelDiscount[];
    _count?: { customers: number };
  },
): PriceLevelView => ({
  id: level.id,
  name: level.name,
  discountPct: toNumber(level.discountPct),
  description: level.description,
  isArchived: level.isArchived,
  categoryDiscounts: level.categoryDiscounts.map((row) => ({
    categoryId: row.categoryId,
    discountPct: toNumber(row.discountPct),
  })),
  customerCount: level._count?.customers ?? 0,
});

export const toSpecialRateView = (rate: SpecialRate): SpecialRateView => ({
  id: rate.id,
  partyId: rate.partyId,
  itemId: rate.itemId,
  categoryId: rate.categoryId,
  kind: rate.kind,
  value: toNumber(rate.value),
  validFrom: isoDate(rate.validFrom),
  validTill: rate.validTill ? isoDate(rate.validTill) : null,
  notes: rate.notes,
  isArchived: rate.isArchived,
});

export const toQuantitySlabView = (slab: QuantitySlab): QuantitySlabView => ({
  id: slab.id,
  itemId: slab.itemId,
  categoryId: slab.categoryId,
  minQuantity: toNumber(slab.minQuantity),
  discountPct: toNumber(slab.discountPct),
  isArchived: slab.isArchived,
});
