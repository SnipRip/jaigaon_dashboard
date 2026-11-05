import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { sumTax, taxOn } from '../common/gst/tax-split.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma, QuotationStatus } from '../generated/prisma/client.js';
import { loadItemFacts } from '../items/item-document-facts.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { LineRateOptionsService } from '../pricing/line-rate-options.service.js';
import { companyState } from '../purchases/purchase-context.js';
import { SchemesService } from '../schemes/schemes.service.js';
import type { QuotationDto, ReviseQuotationDto } from './dto/quotation.dto.js';
import { rateSourceOf, schemeSourceOf, saleRegime } from './quotation-rules.js';
import { quotationInclude, toQuotationView, type QuotationView } from './quotation-views.js';

type Tx = Prisma.TransactionClient;

const money = (value: number) => Math.round(value * 100) / 100;

/** Where a quotation may go from each status. */
const NEXT: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  REJECTED: ['SENT'],
  CANCELLED: [],
};

// Quotations. On save every line is priced again on the server: the rate
// the line took is matched to what it was offered (special rate, today's
// rate-sheet rate, last quoted, last sold) to record where it came from, the
// schemes in force are applied, GST follows the customer, and the last
// landed cost is kept for the margin. The browser's figures are only a preview.
@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
    private readonly options: LineRateOptionsService,
    private readonly schemes: SchemesService,
  ) {}

  async list(partyId?: string): Promise<QuotationView[]> {
    const rows = await this.prisma.quotation.findMany({
      where: { partyId },
      include: quotationInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toQuotationView);
  }

  async get(id: string): Promise<QuotationView> {
    return toQuotationView(await this.prisma.quotation.findUniqueOrThrow({ where: { id }, include: quotationInclude }));
  }

  create(dto: QuotationDto, userId: string): Promise<QuotationView> {
    return this.prisma.$transaction(async (tx) => {
      const priced = await this.price(tx, dto);
      const claimed = await this.numbers.issue(tx, 'QUOTATION', dto.date);
      const row = await tx.quotation.create({
        data: { ...priced.header, number: claimed.number, issuedNumberId: claimed.id, status: dto.status ?? 'SENT', createdById: userId, lines: { create: priced.lines } },
        include: quotationInclude,
      });
      return toQuotationView(row);
    });
  }

  /** A new revision: same number, new lines; the old total is kept with the note. */
  revise(id: string, dto: ReviseQuotationDto): Promise<QuotationView> {
    return this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: QuotationStatus; revision: number; date: Date; total: Prisma.Decimal; partyId: string }[]>`
        SELECT "status", "revision", "date", "total", "partyId" FROM "Quotation" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!current) throw new BadRequestException('That quotation does not exist');
      if (current.status === 'ACCEPTED' || current.status === 'CANCELLED') {
        throw new ConflictException(`An ${current.status.toLowerCase()} quotation is not revised. Make a new one.`);
      }
      const priced = await this.price(tx, dto, id);
      await tx.quotationRevision.create({ data: { quotationId: id, revision: current.revision, date: current.date, total: current.total, note: dto.note } });
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      const row = await tx.quotation.update({
        where: { id },
        data: {
          ...priced.header,
          revision: current.revision + 1,
          status: dto.status ?? (current.status === 'DRAFT' ? 'DRAFT' : 'SENT'),
          lines: { create: priced.lines },
        },
        include: quotationInclude,
      });
      return toQuotationView(row);
    });
  }

  setStatus(id: string, status: QuotationStatus): Promise<QuotationView> {
    return this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: QuotationStatus; issuedNumberId: string | null }[]>`
        SELECT "status", "issuedNumberId" FROM "Quotation" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!current) throw new BadRequestException('That quotation does not exist');
      if (!NEXT[current.status].includes(status)) {
        throw new ConflictException(`A ${current.status.toLowerCase()} quotation cannot be marked ${status.toLowerCase()}`);
      }
      if (status === 'CANCELLED' && current.issuedNumberId) await this.numbers.cancel(tx, current.issuedNumberId);
      return toQuotationView(await tx.quotation.update({ where: { id }, data: { status }, include: quotationInclude }));
    });
  }

  /** Prices every line on the server and works out the totals. */
  private async price(tx: Tx, dto: QuotationDto, quotationId?: string) {
    if (dto.validUntil < dto.date) throw new BadRequestException('Valid till is before the quotation date');
    const party = await tx.party.findUnique({
      where: { id: dto.partyId },
      select: { isCustomer: true, isArchived: true, treatment: true, placeOfSupply: true, exportRoute: true },
    });
    if (!party?.isCustomer) throw new BadRequestException('Pick a customer');
    if (party.isArchived) throw new BadRequestException('This customer is archived');
    const { regime, split } = saleRegime(await companyState(tx), party);

    const itemIds = [...new Set(dto.lines.map((line) => line.itemId))];
    const [facts, offered] = await Promise.all([
      loadItemFacts(tx, itemIds, dto.date),
      this.options.forLines({ partyId: dto.partyId, date: dto.date, itemIds, excludeQuotationId: quotationId }),
    ]);
    const offeredOf = new Map(offered.map((row) => [row.itemId, row]));

    const lines = dto.lines.map((line, position) => {
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
      dto.partyId,
      dto.date,
      lines.map(({ line, position, rateSource, discountPct }) => ({
        key: String(position),
        itemId: line.itemId,
        quantity: line.quantity,
        rate: line.rate,
        discountPct,
        rateSource: schemeSourceOf(rateSource),
      })),
    );

    const totals = { gross: 0, schemeDiscount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cost: 0 };
    const rows = lines.map(({ line, position, item, options, rateSource, discountPct }) => {
      const priced = schemes.lines[position];
      const tax = taxOn(priced.taxable, item.gstRatePct!, split);
      const cost = options.costs.lastLandedCost;
      totals.gross = money(totals.gross + priced.gross);
      totals.schemeDiscount = money(totals.schemeDiscount + priced.schemeDiscount);
      totals.taxable = money(totals.taxable + priced.taxable);
      totals.cgst = money(totals.cgst + tax.cgst);
      totals.sgst = money(totals.sgst + tax.sgst);
      totals.igst = money(totals.igst + tax.igst);
      if (cost !== null) totals.cost = money(totals.cost + cost * (line.quantity + priced.freeQuantity));
      return {
        position,
        partyId: dto.partyId,
        date: dateOnly(dto.date),
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
        schemeDiscount: priced.schemeDiscount,
        freeQuantity: priced.freeQuantity,
        schemes: priced.applied as unknown as Prisma.InputJsonValue,
        gstRatePct: item.gstRatePct!,
        taxable: priced.taxable,
        tax: sumTax(tax),
        costAtQuote: cost,
      };
    });
    const tax = money(totals.cgst + totals.sgst + totals.igst);
    const exact = money(totals.taxable + tax);
    const total = Math.round(exact);
    return {
      header: {
        date: dateOnly(dto.date),
        validUntil: dateOnly(dto.validUntil),
        partyId: dto.partyId,
        regime,
        terms: dto.terms ?? null,
        notes: dto.notes ?? null,
        gross: totals.gross,
        schemeDiscount: totals.schemeDiscount,
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        tax,
        roundOff: money(total - exact),
        total,
        cost: totals.cost,
      },
      lines: rows,
    };
  }
}
