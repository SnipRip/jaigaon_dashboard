// Pricing records as the API returns them: Decimals as numbers, dates as
// YYYY-MM-DD. The views also serve as the facts pricing-rules.ts reads.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { SpecialRate } from '../generated/prisma/client.js';
import type { SpecialRateFacts } from './pricing-rules.js';

export interface SpecialRateView extends SpecialRateFacts {
  notes: string | null;
}

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
