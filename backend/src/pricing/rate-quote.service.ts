import { BadRequestException, Injectable } from '@nestjs/common';
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { RateQuoteQueryDto } from './dto/rate-quote-query.dto.js';
import { inForce, resolveRate, type RateQuote } from './pricing-rules.js';
import {
  priceLevelInclude,
  toPriceLevelView,
  toQuantitySlabView,
  toSpecialRateView,
} from './pricing-views.js';

export interface RateQuoteView extends RateQuote {
  /** The figures the quote started from. */
  sellingPrice: number;
  mrp: number | null;
  minSellingPrice: number | null;
  costPrice: number;
  date: string;
}

// The rate a quotation or invoice line takes for (customer, item, quantity,
// date), from the rules in pricing-rules.ts.
@Injectable()
export class RateQuoteService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(query: RateQuoteQueryDto): Promise<RateQuoteView> {
    const date = query.date ?? isoDate(new Date());
    const item = await this.prisma.item.findUniqueOrThrow({
      where: { id: query.itemId },
    });
    const categoryIds = [
      item.categoryId,
      ...(item.subCategoryId ? [item.subCategoryId] : []),
    ];
    const forItem = {
      OR: [{ itemId: item.id }, { categoryId: { in: categoryIds } }],
      isArchived: false,
    };

    let customer: Parameters<typeof resolveRate>[1];
    let specialRates: ReturnType<typeof toSpecialRateView>[] = [];
    if (query.partyId) {
      const party = await this.prisma.party.findUniqueOrThrow({
        where: { id: query.partyId },
        include: { priceLevel: { include: priceLevelInclude } },
      });
      if (!party.isCustomer)
        throw new BadRequestException('Rates are quoted for customers only');
      customer = {
        id: party.id,
        level: party.priceLevel
          ? toPriceLevelView(party.priceLevel)
          : undefined,
      };
      const rows = await this.prisma.specialRate.findMany({
        where: { partyId: party.id, ...forItem },
      });
      specialRates = rows
        .map(toSpecialRateView)
        .filter((rate) => inForce(rate, date));
    }
    const slabs = (
      await this.prisma.quantitySlab.findMany({ where: forItem })
    ).map(toQuantitySlabView);

    const prices = {
      sellingPrice: toNumber(item.sellingPrice),
      mrp: toNumber(item.mrp),
      minSellingPrice: toNumber(item.minSellingPrice),
    };
    const quote = resolveRate(
      {
        id: item.id,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        ...prices,
      },
      customer,
      query.quantity,
      date,
      { specialRates, slabs },
    );
    return { ...quote, ...prices, costPrice: toNumber(item.costPrice), date };
  }
}
