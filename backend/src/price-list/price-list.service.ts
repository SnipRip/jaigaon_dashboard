import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly, todayInIndia } from '../common/dates.js';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { itemCostSource } from '../items/item-costs.js';
import { inherited } from '../items/item-rules.js';
import type { BulkItemPricesDto } from './dto/bulk-item-prices.dto.js';
import type { CopyItemPricesDto } from './dto/copy-item-prices.dto.js';
import type { CreateItemPriceDto } from './dto/create-item-price.dto.js';
import type { ItemPriceFieldsDto } from './dto/item-price-fields.dto.js';
import type { ListItemPricesQueryDto } from './dto/list-item-prices-query.dto.js';
import type { PriceSheetQueryDto } from './dto/price-sheet-query.dto.js';
import type { UpdateItemPriceDto } from './dto/update-item-price.dto.js';
import {
  byItem,
  itemPriceProblem,
  marginProblem,
  priceFromMargin,
  priceInForce,
} from './price-list-rules.js';
import {
  itemPriceInclude,
  toItemMasterPrices,
  toItemPriceView,
  type ItemPriceView,
  type PriceSheetView,
} from './price-list-views.js';

type Tx = Prisma.TransactionClient;
type PricedItem = Prisma.ItemGetPayload<{ select: typeof PRICED_ITEM }>;

/** What one save writes, once the price is known and the dates are filled. */
interface Draft {
  itemId: string;
  validFrom: string;
  validTill: string;
  sellingPrice: number;
  mrp: number | null;
  minSellingPrice: number | null;
  costPrice: number | null;
  notes: string | null;
  isArchived: boolean;
}

const PRICED_ITEM = {
  id: true,
  sku: true,
  isArchived: true,
  mrp: true,
  ...itemCostSource,
} as const;

/** Big lists (a few thousand rows) need longer than Prisma's 5 s default. */
const BULK_TRANSACTION = { timeout: 120_000, maxWait: 10_000 };
/** How many row problems a refused bulk save names. */
const PROBLEMS_SHOWN = 15;

/** Entries that cover the date (as a `where`). */
const coveringDate = (date: string) => ({
  validFrom: { lte: dateOnly(date) },
  validTill: { gte: dateOnly(date) },
  isArchived: false,
});

// The day-wise price list: one entry per item and date range, layered (see
// price-list-rules.ts). Every save path (one entry, a bulk save from the
// table, a copied day, an Excel row) ends in `draftFor` and `write`, so the
// rules are the same everywhere.
@Injectable()
export class PriceListService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every live item with the price in force on the date: the page's table. */
  async sheet(query: PriceSheetQueryDto): Promise<PriceSheetView> {
    const date = query.date ?? todayInIndia();
    const unitOf = { defaultUnit: { select: { symbol: true } } };
    const [items, entries] = await Promise.all([
      this.prisma.item.findMany({
        where: { isArchived: false },
        orderBy: [{ name: 'asc' }, { sku: 'asc' }],
        select: {
          ...PRICED_ITEM,
          name: true,
          categoryId: true,
          subCategoryId: true,
          unit: { select: { symbol: true } },
          group: { select: unitOf },
          subCategory: { select: unitOf },
          category: { select: unitOf },
        },
      }),
      this.prisma.itemPrice.findMany({
        where: coveringDate(date),
        include: itemPriceInclude,
      }),
    ]);
    const entriesOf = byItem(entries.map(toItemPriceView));
    return {
      date,
      rows: items.map((item) => {
        const covering = entriesOf.get(item.id) ?? [];
        const entry = priceInForce(covering, date) ?? null;
        return {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          unit: inherited(
            item.unit?.symbol,
            item.group?.defaultUnit?.symbol,
            item.subCategory?.defaultUnit?.symbol,
            item.category.defaultUnit?.symbol,
          ),
          categoryId: item.categoryId,
          subCategoryId: item.subCategoryId,
          item: toItemMasterPrices(item),
          entry,
          overridden: Math.max(covering.length - 1, 0),
        };
      }),
    };
  }

  /** Entries, newest start first (one item's history with `?itemId=`). */
  async list(query: ListItemPricesQueryDto): Promise<ItemPriceView[]> {
    const entries = await this.prisma.itemPrice.findMany({
      where: { ...archivedFilter(query.includeArchived), itemId: query.itemId },
      orderBy: [
        { validFrom: 'desc' },
        { validTill: 'asc' },
        { updatedAt: 'desc' },
      ],
      include: itemPriceInclude,
      take: query.itemId ? undefined : 5000,
    });
    return entries.map(toItemPriceView);
  }

  /** One entry. The same item and dates as a stored one replaces it. */
  create(dto: CreateItemPriceDto, userId: string): Promise<ItemPriceView> {
    return this.prisma.$transaction(async (tx) => {
      const item = await this.liveItem(tx, dto.itemId);
      const draft = this.draftFor(item, dto, dto.validFrom, dto.validTill);
      return this.write(tx, draft, userId);
    });
  }

  update(
    id: string,
    dto: UpdateItemPriceDto,
    userId: string,
  ): Promise<ItemPriceView> {
    return this.prisma.$transaction(async (tx) => {
      const current = toItemPriceView(
        await tx.itemPrice.findUniqueOrThrow({ where: { id } }),
      );
      const item = await tx.item.findUniqueOrThrow({
        where: { id: current.itemId },
        select: PRICED_ITEM,
      });
      // Fields left out keep their stored value; null clears an optional one.
      const sent = Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      ) as Partial<UpdateItemPriceDto>;
      // A new margin with no new price means "work the price out again".
      const fields: ItemPriceFieldsDto = {
        ...current,
        ...sent,
        sellingPrice:
          sent.sellingPrice ??
          (sent.marginPct != null ? undefined : current.sellingPrice),
      };
      const validFrom = sent.validFrom ?? current.validFrom;
      // Moving the start of a single-day price moves the whole day.
      const validTill =
        sent.validTill !== undefined
          ? sent.validTill
          : current.validTill === current.validFrom
            ? validFrom
            : current.validTill;
      const draft = this.draftFor(
        item,
        fields,
        validFrom,
        validTill,
        sent.isArchived ?? current.isArchived,
      );
      if (!draft.isArchived && item.isArchived)
        throw new BadRequestException('This item is archived');
      return toItemPriceView(
        await tx.itemPrice.update({
          where: { id },
          data: { ...this.row(draft), updatedById: userId },
          include: itemPriceInclude,
        }),
      );
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.itemPrice.delete({ where: { id } });
  }

  /**
   * Many prices for the same dates, all saved or none. Every row is checked
   * before anything is written, and a refusal names the rows to fix.
   */
  bulk(dto: BulkItemPricesDto, userId: string): Promise<{ saved: number }> {
    return this.prisma.$transaction(async (tx) => {
      const ids = [...new Set(dto.rows.map((row) => row.itemId))];
      if (ids.length !== dto.rows.length)
        throw new BadRequestException('An item appears twice in the list');
      const items = new Map(
        (
          await tx.item.findMany({
            where: { id: { in: ids } },
            select: PRICED_ITEM,
          })
        ).map((item) => [item.id, item]),
      );
      const problems: string[] = [];
      const drafts: Draft[] = [];
      for (const row of dto.rows) {
        const item = items.get(row.itemId);
        try {
          if (!item) throw new BadRequestException('the item does not exist');
          if (item.isArchived)
            throw new BadRequestException('the item is archived');
          drafts.push(this.draftFor(item, row, dto.validFrom, dto.validTill));
        } catch (error) {
          problems.push(
            `${item?.sku ?? row.itemId}: ${(error as Error).message}`,
          );
        }
      }
      if (problems.length) {
        const more =
          problems.length > PROBLEMS_SHOWN
            ? ` (and ${problems.length - PROBLEMS_SHOWN} more)`
            : '';
        throw new BadRequestException(
          `Nothing was saved. ${problems.slice(0, PROBLEMS_SHOWN).join('; ')}${more}`,
        );
      }
      for (const draft of drafts) await this.write(tx, draft, userId);
      return { saved: drafts.length };
    }, BULK_TRANSACTION);
  }

  /** The price-list prices in force on one day, set again for another day or range. */
  copy(dto: CopyItemPricesDto, userId: string): Promise<{ saved: number }> {
    return this.prisma.$transaction(async (tx) => {
      const entries = (
        await tx.itemPrice.findMany({
          where: {
            ...coveringDate(dto.fromDate),
            ...(dto.itemIds ? { itemId: { in: dto.itemIds } } : {}),
            item: { isArchived: false },
          },
        })
      ).map(toItemPriceView);
      const winners = [...byItem(entries).values()]
        .map((covering) => priceInForce(covering, dto.fromDate))
        .filter((entry) => entry !== undefined);
      if (!winners.length) {
        throw new BadRequestException(
          'No rate-sheet prices on that day to copy',
        );
      }
      const items = new Map(
        (
          await tx.item.findMany({
            where: { id: { in: winners.map((entry) => entry.itemId) } },
            select: PRICED_ITEM,
          })
        ).map((item) => [item.id, item]),
      );
      for (const entry of winners) {
        const draft = this.draftFor(
          items.get(entry.itemId)!,
          entry,
          dto.validFrom,
          dto.validTill,
        );
        await this.write(tx, draft, userId);
      }
      return { saved: winners.length };
    }, BULK_TRANSACTION);
  }

  /** The stored entry for one item and date range (the import's natural key). */
  async findByKey(
    itemId: string,
    validFrom: string,
    validTill: string | null | undefined,
  ): Promise<string | null> {
    const found = await this.prisma.itemPrice.findUnique({
      where: {
        itemId_validFrom_validTill: {
          itemId,
          validFrom: dateOnly(validFrom),
          validTill: dateOnly(validTill ?? validFrom),
        },
      },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  /** Every price in force on the date, as rows for a sheet staff fill in for that day. */
  async template(date: string) {
    const { rows } = await this.sheet({ date });
    return rows;
  }

  private async liveItem(tx: Tx, id: string): Promise<PricedItem> {
    const item = await tx.item.findUnique({
      where: { id },
      select: PRICED_ITEM,
    });
    if (!item) throw new BadRequestException('That item does not exist');
    if (item.isArchived) throw new BadRequestException('This item is archived');
    return item;
  }

  /** The entry to write: price worked out from a margin when left out, blank till = that day. */
  private draftFor(
    item: PricedItem,
    fields: ItemPriceFieldsDto,
    validFrom: string,
    validTill: string | null | undefined,
    isArchived = false,
  ): Draft {
    const master = toItemMasterPrices(item);
    // A blank Excel cell arrives as null: the same as left out.
    let sellingPrice = fields.sellingPrice;
    if (sellingPrice == null) {
      if (fields.marginPct == null)
        throw new BadRequestException('Give the price or the margin');
      const problem = marginProblem(fields.marginPct);
      if (problem) throw new BadRequestException(problem);
      const cost = fields.costPrice ?? master.costPrice;
      if (cost === null)
        throw new BadRequestException(
          'This item has no stock yet, so no cost: give the price, or a cost for these days',
        );
      sellingPrice = priceFromMargin(cost, fields.marginPct);
    }
    const draft: Draft = {
      itemId: item.id,
      validFrom,
      validTill: validTill ?? validFrom,
      sellingPrice,
      mrp: fields.mrp ?? null,
      minSellingPrice: fields.minSellingPrice ?? null,
      costPrice: fields.costPrice ?? null,
      notes: fields.notes ?? null,
      isArchived,
    };
    const problem = itemPriceProblem(draft, master);
    if (problem) throw new BadRequestException(problem);
    return draft;
  }

  /** Creates the entry, or replaces the one with the same item and dates (restoring it if archived). */
  private async write(
    tx: Tx,
    draft: Draft,
    userId: string,
  ): Promise<ItemPriceView> {
    const data = this.row(draft);
    const saved = await tx.itemPrice.upsert({
      where: {
        itemId_validFrom_validTill: {
          itemId: draft.itemId,
          validFrom: data.validFrom,
          validTill: data.validTill,
        },
      },
      create: {
        itemId: draft.itemId,
        ...data,
        createdById: userId,
        updatedById: userId,
      },
      update: { ...data, updatedById: userId },
      include: itemPriceInclude,
    });
    return toItemPriceView(saved);
  }

  private row(draft: Draft) {
    return {
      validFrom: dateOnly(draft.validFrom),
      validTill: dateOnly(draft.validTill),
      sellingPrice: draft.sellingPrice,
      mrp: draft.mrp,
      minSellingPrice: draft.minSellingPrice,
      costPrice: draft.costPrice,
      notes: draft.notes,
      isArchived: draft.isArchived,
    };
  }
}
