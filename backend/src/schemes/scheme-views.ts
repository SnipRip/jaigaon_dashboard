// Schemes as the API returns them: Decimals as numbers, dates as
// YYYY-MM-DD. The view is also the facts scheme-rules.ts reads.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { SchemeFacts } from './scheme-rules.js';

export interface SchemeView extends SchemeFacts {
  description: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const schemeInclude = {
  targets: { select: { itemId: true, categoryId: true, brandId: true } },
  parties: { select: { partyId: true } },
} as const;

type SchemeRow = Prisma.SchemeGetPayload<{ include: typeof schemeInclude }>;

export const toSchemeView = (row: SchemeRow): SchemeView => ({
  id: row.id,
  name: row.name,
  description: row.description,
  level: row.level,
  benefit: row.benefit,
  value: toNumber(row.value),
  buyQuantity: toNumber(row.buyQuantity),
  maxDiscount: toNumber(row.maxDiscount),
  minQuantity: toNumber(row.minQuantity),
  minValue: toNumber(row.minValue),
  partyScope: row.partyScope,
  partyIds: row.parties.map((party) => party.partyId),
  targets: row.targets,
  rateSources: row.rateSources,
  stackable: row.stackable,
  validFrom: isoDate(row.validFrom),
  validTill: row.validTill ? isoDate(row.validTill) : null,
  notes: row.notes,
  isArchived: row.isArchived,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
