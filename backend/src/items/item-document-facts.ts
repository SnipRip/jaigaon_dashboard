// What a document line needs to know about its items, in one load for all
// lines: name, HSN, base unit, GST rate on the document's date, weight and
// placement. The GST rate follows the item screens' order: the item's own
// rate, else the HSN master's rate in force on the date (the longest master
// code the item's HSN starts with), else the group, sub-category, category.
// The unit is the item's, else the group's, sub-category's, category's.
import { BadRequestException } from '@nestjs/common';
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { bestMatch, rateOn } from '../hsn-codes/hsn-rules.js';
import { inherited } from './item-rules.js';

type Db = Prisma.TransactionClient;

export interface ItemDocumentFacts {
  id: string;
  name: string;
  sku: string;
  hsn: string;
  /** Unit symbol, as printed: kg, pcs. */
  unit: string;
  /** Null when nothing up the chain sets one. */
  gstRatePct: number | null;
  /** Kilograms per base unit; null when unknown. */
  weightKg: number | null;
  categoryId: string;
  subCategoryId: string | null;
  brandId: string | null;
  isArchived: boolean;
}

const level = { select: { gstRatePct: true, defaultUnit: { select: { symbol: true } } } } as const;

export async function loadItemFacts(db: Db, itemIds: string[], date: string): Promise<Map<string, ItemDocumentFacts>> {
  const ids = [...new Set(itemIds)];
  const [items, codes] = await Promise.all([
    db.item.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        sku: true,
        hsn: true,
        gstRatePct: true,
        weightKg: true,
        categoryId: true,
        subCategoryId: true,
        brandId: true,
        isArchived: true,
        unit: { select: { symbol: true } },
        group: level,
        subCategory: level,
        category: level,
      },
    }),
    db.hsnCode.findMany({ select: { code: true, rates: { select: { ratePct: true, effectiveFrom: true } } } }),
  ]);
  if (items.length !== ids.length) throw new BadRequestException('An item on the document does not exist');
  return new Map(
    items.map((item) => {
      const code = bestMatch(codes, item.hsn);
      const hsnRate = code && rateOn(code.rates.map((rate) => ({ ratePct: toNumber(rate.ratePct), effectiveFrom: isoDate(rate.effectiveFrom) })), date);
      const gstRatePct = inherited(
        toNumber(item.gstRatePct),
        hsnRate,
        toNumber(item.group?.gstRatePct ?? null),
        toNumber(item.subCategory?.gstRatePct ?? null),
        toNumber(item.category.gstRatePct),
      );
      const unit = inherited(item.unit?.symbol, item.group?.defaultUnit?.symbol, item.subCategory?.defaultUnit?.symbol, item.category.defaultUnit?.symbol);
      return [
        item.id,
        {
          id: item.id,
          name: item.name,
          sku: item.sku,
          hsn: item.hsn,
          unit: unit ?? 'unit',
          gstRatePct,
          weightKg: toNumber(item.weightKg),
          categoryId: item.categoryId,
          subCategoryId: item.subCategoryId,
          brandId: item.brandId,
          isArchived: item.isArchived,
        },
      ];
    }),
  );
}
