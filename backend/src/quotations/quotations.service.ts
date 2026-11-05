import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma, QuotationStatus } from '../generated/prisma/client.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { companyState } from '../purchases/purchase-context.js';
import { SalePricingService } from '../sale-pricing/sale-pricing.service.js';
import { saleRegime } from '../sale-pricing/sale-rules.js';
import type { QuotationDto, ReviseQuotationDto } from './dto/quotation.dto.js';
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
  // Only through the invoice: cancelling it brings the quotation back to ACCEPTED.
  CONVERTED: [],
};

// Quotations. On save every line is priced again on the server
// (SalePricingService: rate source, schemes, GST follows the customer), and
// the last landed cost is kept for the margin. The browser's figures are only
// a preview. Converting to an invoice happens in src/invoices.
@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
    private readonly pricing: SalePricingService,
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
      if (current.status === 'ACCEPTED' || current.status === 'CANCELLED' || current.status === 'CONVERTED') {
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
    const { lines, totals } = await this.pricing.price(tx, { partyId: dto.partyId, date: dto.date, split, lines: dto.lines, excludeQuotationId: quotationId });

    let cost = 0;
    const rows = lines.map(({ row, options }) => {
      const costAtQuote = options.costs.lastLandedCost;
      if (costAtQuote !== null) cost = money(cost + costAtQuote * (row.quantity + row.freeQuantity));
      return { ...row, costAtQuote };
    });
    return {
      header: {
        date: dateOnly(dto.date),
        validUntil: dateOnly(dto.validUntil),
        partyId: dto.partyId,
        regime,
        terms: dto.terms ?? null,
        notes: dto.notes ?? null,
        ...totals,
        cost,
      },
      lines: rows,
    };
  }
}
