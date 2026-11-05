import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { itemCostSource, itemCosts, type ItemCosts } from '../items/item-costs.js';
import { byItem, effectivePrices, priceInForce } from '../price-list/price-list-rules.js';
import { quotationLabel } from '../sale-pricing/sale-rules.js';
import { toItemMasterPrices, toItemPriceView } from '../price-list/price-list-views.js';
import type { LineRateOptionsDto } from './dto/line-rate-options.dto.js';
import { resolveRate, type RateQuote, type SpecialRateFacts } from './pricing-rules.js';
import { toSpecialRateView } from './pricing-views.js';

/** A past line's rate after its typed discount, to paise. */
const netOfDiscount = (line: { rate: Prisma.Decimal; discountPct: Prisma.Decimal }) =>
  Math.round(toNumber(line.rate) * (1 - toNumber(line.discountPct) / 100) * 100) / 100;

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
  /** The latest quotation line for this customer and item (sent, not a draft or cancelled): its rate after the line's discount. */
  lastQuoted: PastRate | null;
  /** The latest issued (not cancelled) invoice line for this customer and item: its rate after the line's discount. */
  lastSold: PastRate | null;
}

export interface PastRate {
  rate: number;
  date: string;
  number: string;
  documentId: string;
}

// The rate order is in pricing-rules.ts. This loads its inputs for many
// items in six queries, whatever the number of lines. Last quoted and last
// sold read the document lines themselves (agent/selling-rate-plan.md, section 4).
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

    const [covering, previous, specials, quoted, sold] = await Promise.all([
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
      dto.partyId ? this.lastQuoted(dto.partyId, dto.itemIds, day, dto.excludeQuotationId) : Promise.resolve(new Map<string, PastRate>()),
      dto.partyId ? this.lastSold(dto.partyId, dto.itemIds, day) : Promise.resolve(new Map<string, PastRate>()),
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
        costs: itemCosts(row),
        lastQuoted: quoted.get(item.id) ?? null,
        lastSold: sold.get(item.id) ?? null,
      };
    });
  }

  /**
   * One row per item: the newest line quoted to this customer on or before
   * the date (a top-1 scan of the partyId, itemId, date index). Drafts were
   * never given to the customer and cancelled ones were withdrawn.
   */
  private async lastQuoted(partyId: string, itemIds: string[], day: Date, excludeQuotationId?: string): Promise<Map<string, PastRate>> {
    const lines = await this.prisma.quotationLine.findMany({
      where: {
        partyId,
        itemId: { in: itemIds },
        date: { lte: day },
        quotation: { status: { in: ['SENT', 'ACCEPTED', 'REJECTED'] }, ...(excludeQuotationId ? { id: { not: excludeQuotationId } } : {}) },
      },
      orderBy: [{ itemId: 'asc' }, { date: 'desc' }, { quotation: { createdAt: 'desc' } }],
      distinct: ['itemId'],
      select: { itemId: true, rate: true, discountPct: true, date: true, quotation: { select: { id: true, number: true, revision: true } } },
    });
    return new Map(
      lines.map((line) => [
        line.itemId,
        {
          rate: netOfDiscount(line),
          date: isoDate(line.date),
          number: quotationLabel(line.quotation.number, line.quotation.revision),
          documentId: line.quotation.id,
        },
      ]),
    );
  }

  /**
   * One row per item: the newest line invoiced to this customer on or before
   * the date (a top-1 scan of the partyId, itemId, date index). A cancelled
   * invoice sold nothing.
   */
  private async lastSold(partyId: string, itemIds: string[], day: Date): Promise<Map<string, PastRate>> {
    const lines = await this.prisma.invoiceLine.findMany({
      where: { partyId, itemId: { in: itemIds }, date: { lte: day }, invoice: { status: 'ISSUED' } },
      orderBy: [{ itemId: 'asc' }, { date: 'desc' }, { invoice: { createdAt: 'desc' } }],
      distinct: ['itemId'],
      select: { itemId: true, rate: true, discountPct: true, date: true, invoice: { select: { id: true, number: true } } },
    });
    return new Map(
      lines.map((line) => [line.itemId, { rate: netOfDiscount(line), date: isoDate(line.date), number: line.invoice.number, documentId: line.invoice.id }]),
    );
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
