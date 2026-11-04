import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import { itemCostSource, itemCosts, type ItemCosts } from '../items/item-costs.js';
import { byItem, effectivePrices, priceInForce } from '../price-list/price-list-rules.js';
import { toItemMasterPrices, toItemPriceView } from '../price-list/price-list-views.js';
import type { LineRateOptionsDto } from './dto/line-rate-options.dto.js';
import { resolveRate, type RateQuote, type SpecialRateFacts } from './pricing-rules.js';
import { toSpecialRateView } from './pricing-views.js';

/** Everything a quotation or invoice line offers when an item is picked. */
export interface LineRateOptionsView extends Pick<RateQuote, 'rate' | 'source'> {
  itemId: string;
  date: string;
  mrp: number | null;
  /** The rate-sheet entry in force on the date. */
  todaysRate: { id: string; rate: number; validFrom: string; validTill: string } | null;
  /** The party's special rate in force, with the rate it gives. */
  specialRate: (Pick<SpecialRateFacts, 'id' | 'kind' | 'value' | 'validTill'> & { rate: number }) | null;
  /** With no entry today: the latest one that has ended. Only a hint, never filled in. */
  previousSheetRate: { rate: number; validFrom: string; validTill: string } | null;
  /** The minimum price on today's entry; a rate below it shows a warning. */
  floor: number | null;
  /** What the margin is worked out on: the day's cost from the sheet, else the last landed cost. */
  marginCost: number | null;
  costs: ItemCosts;
}

// The rate order is in pricing-rules.ts. This loads its inputs for many
// items in four queries, whatever the number of lines. Last quoted and last
// sold join in once quotations and invoices are stored
// (agent/selling-rate-plan.md, section 4).
@Injectable()
export class LineRateOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async forLines(dto: LineRateOptionsDto): Promise<LineRateOptionsView[]> {
    const date = dto.date ?? todayInIndia();
    const day = dateOnly(date);
    const items = await this.prisma.item.findMany({
      where: { id: { in: dto.itemIds } },
      select: { id: true, categoryId: true, subCategoryId: true, mrp: true, ...itemCostSource },
    });
    if (items.length !== dto.itemIds.length) throw new BadRequestException('An item does not exist');
    const categoryIds = [
      ...new Set(items.flatMap((item) => (item.subCategoryId ? [item.categoryId, item.subCategoryId] : [item.categoryId]))),
    ];

    const [covering, previous, specials] = await Promise.all([
      this.prisma.itemPrice.findMany({
        where: { itemId: { in: dto.itemIds }, isArchived: false, validFrom: { lte: day }, validTill: { gte: day } },
      }),
      // One row per item: the entry that ended last before the date.
      this.prisma.itemPrice.findMany({
        where: { itemId: { in: dto.itemIds }, isArchived: false, validTill: { lt: day } },
        orderBy: [{ itemId: 'asc' }, { validTill: 'desc' }, { validFrom: 'desc' }],
        distinct: ['itemId'],
      }),
      dto.partyId ? this.specialRatesFor(dto.partyId, dto.itemIds, categoryIds) : Promise.resolve([]),
    ]);
    const entriesOf = byItem(covering.map(toItemPriceView));
    const previousOf = new Map(previous.map((entry) => [entry.itemId, toItemPriceView(entry)]));

    return items.map((row) => {
      const item = { id: row.id, categoryId: row.categoryId, subCategoryId: row.subCategoryId, mrp: toNumber(row.mrp) };
      const master = toItemMasterPrices(row);
      const entry = priceInForce(entriesOf.get(item.id) ?? [], date);
      const prices = entry && effectivePrices(entry, master);
      const listed = entry && prices && { ...prices, id: entry.id, validFrom: entry.validFrom, validTill: entry.validTill };
      const quote = resolveRate(item, dto.partyId, date, specials, listed);
      const earlier = entry ? undefined : previousOf.get(item.id);
      const special = quote.source === 'special' ? quote.special : undefined;
      return {
        rate: quote.rate,
        source: quote.source,
        itemId: item.id,
        date,
        mrp: item.mrp,
        todaysRate: entry
          ? { id: entry.id, rate: entry.sellingPrice, validFrom: entry.validFrom, validTill: entry.validTill }
          : null,
        specialRate: special
          ? { id: special.id, kind: special.kind, value: special.value, validTill: special.validTill, rate: quote.rate! }
          : null,
        previousSheetRate: earlier
          ? { rate: earlier.sellingPrice, validFrom: earlier.validFrom, validTill: earlier.validTill }
          : null,
        floor: prices?.minSellingPrice ?? null,
        marginCost: prices?.costPrice ?? master.costPrice,
        costs: itemCosts(row.openingStock),
      };
    });
  }

  private async specialRatesFor(partyId: string, itemIds: string[], categoryIds: string[]) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId }, select: { isCustomer: true } });
    if (!party) throw new BadRequestException('That customer does not exist');
    if (!party.isCustomer) throw new BadRequestException('Rates are quoted for customers only');
    const rows = await this.prisma.specialRate.findMany({
      where: { partyId, isArchived: false, OR: [{ itemId: { in: itemIds } }, { categoryId: { in: categoryIds } }] },
    });
    return rows.map(toSpecialRateView);
  }
}
