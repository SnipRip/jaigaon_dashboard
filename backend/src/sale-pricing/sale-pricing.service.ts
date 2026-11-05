import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { sumTax, taxOn, type TaxSplit } from '../common/gst/tax-split.js';
import type { LineRateSource, Prisma } from '../generated/prisma/client.js';
import { loadItemFacts, type ItemDocumentFacts } from '../items/item-document-facts.js';
import { LineRateOptionsService, type LineRateOptionsView } from '../pricing/line-rate-options.service.js';
import { SchemesService } from '../schemes/schemes.service.js';
import { rateSourceOf, schemeSourceOf } from './sale-rules.js';

type Tx = Prisma.TransactionClient;

const money = (value: number) => Math.round(value * 100) / 100;

export interface SaleLineInput {
  itemId: string;
  quantity: number;
  rate: number;
  discountPct?: number;
}

export interface SalePricingInput {
  partyId: string;
  date: string;
  split: TaxSplit;
  lines: SaleLineInput[];
  /** A quotation being revised: its own lines are not "last quoted". */
  excludeQuotationId?: string;
}

/** A priced line: the columns quotation and invoice lines share, plus what the caller needs for its own. */
export interface PricedSaleLine {
  row: {
    position: number;
    partyId: string;
    date: Date;
    itemId: string;
    description: string;
    hsn: string;
    unit: string;
    quantity: number;
    rate: number;
    discountPct: number;
    rateSource: LineRateSource;
    suggestedRate: number | null;
    itemPriceId: string | null;
    specialRateId: string | null;
    schemeDiscount: number;
    freeQuantity: number;
    schemes: Prisma.InputJsonValue;
    gstRatePct: number;
    taxable: number;
    tax: number;
  };
  item: ItemDocumentFacts;
  options: LineRateOptionsView;
}

export interface SaleTotals {
  gross: number;
  schemeDiscount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  roundOff: number;
  total: number;
}

// Prices the lines of a quotation or invoice inside its save transaction:
// the rate each line took is matched to what it was offered (special rate,
// today's rate-sheet rate, last quoted, last sold) to record its source, the
// schemes in force on the date are applied, and GST is split as the caller's
// regime says. The browser's figures are only a preview.
@Injectable()
export class SalePricingService {
  constructor(
    private readonly options: LineRateOptionsService,
    private readonly schemes: SchemesService,
  ) {}

  async price(tx: Tx, input: SalePricingInput): Promise<{ lines: PricedSaleLine[]; totals: SaleTotals }> {
    const itemIds = [...new Set(input.lines.map((line) => line.itemId))];
    const [facts, offered] = await Promise.all([
      loadItemFacts(tx, itemIds, input.date),
      this.options.forLines({ partyId: input.partyId, date: input.date, itemIds, excludeQuotationId: input.excludeQuotationId }),
    ]);
    const offeredOf = new Map(offered.map((row) => [row.itemId, row]));

    const lines = input.lines.map((line, position) => {
      const item = facts.get(line.itemId)!;
      if (item.isArchived) throw new BadRequestException(`${item.name} is archived`);
      if (line.quantity <= 0) throw new BadRequestException(`Enter the quantity of ${item.name}`);
      if (item.gstRatePct === null) throw new BadRequestException(`${item.name} has no GST rate: set its HSN in the HSN master`);
      const options = offeredOf.get(line.itemId)!;
      const rateSource = rateSourceOf(line.rate, {
        special: options.specialRate?.rate ?? null,
        sheet: options.todaysRate?.rate ?? null,
        lastQuoted: options.lastQuoted?.rate ?? null,
        lastSold: options.lastSold?.rate ?? null,
      });
      return { line, position, item, options, rateSource, discountPct: line.discountPct ?? 0 };
    });

    const schemes = await this.schemes.forDocument(
      tx,
      input.partyId,
      input.date,
      lines.map(({ line, position, rateSource, discountPct }) => ({
        key: String(position),
        itemId: line.itemId,
        quantity: line.quantity,
        rate: line.rate,
        discountPct,
        rateSource: schemeSourceOf(rateSource),
      })),
    );

    const sums = { gross: 0, schemeDiscount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    const priced = lines.map(({ line, position, item, options, rateSource, discountPct }): PricedSaleLine => {
      const result = schemes.lines[position];
      const tax = taxOn(result.taxable, item.gstRatePct!, input.split);
      sums.gross = money(sums.gross + result.gross);
      sums.schemeDiscount = money(sums.schemeDiscount + result.schemeDiscount);
      sums.taxable = money(sums.taxable + result.taxable);
      sums.cgst = money(sums.cgst + tax.cgst);
      sums.sgst = money(sums.sgst + tax.sgst);
      sums.igst = money(sums.igst + tax.igst);
      return {
        item,
        options,
        row: {
          position,
          partyId: input.partyId,
          date: dateOnly(input.date),
          itemId: line.itemId,
          description: item.name,
          hsn: item.hsn,
          unit: item.unit,
          quantity: line.quantity,
          rate: line.rate,
          discountPct,
          rateSource,
          suggestedRate: options.rate,
          itemPriceId: rateSource === 'SHEET' ? (options.todaysRate?.id ?? null) : null,
          specialRateId: rateSource === 'SPECIAL' ? (options.specialRate?.id ?? null) : null,
          schemeDiscount: result.schemeDiscount,
          freeQuantity: result.freeQuantity,
          schemes: result.applied as unknown as Prisma.InputJsonValue,
          gstRatePct: item.gstRatePct!,
          taxable: result.taxable,
          tax: sumTax(tax),
        },
      };
    });
    const tax = money(sums.cgst + sums.sgst + sums.igst);
    const exact = money(sums.taxable + tax);
    const total = Math.round(exact);
    return { lines: priced, totals: { ...sums, tax, roundOff: money(total - exact), total } };
  }
}
