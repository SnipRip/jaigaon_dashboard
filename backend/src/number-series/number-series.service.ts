import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { definedFields } from '../common/dto/defined-fields.js';
import { financialYearOf } from '../common/financial-year.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { SeriesDocument } from '../generated/prisma/enums.js';
import type { CreateNumberSeriesDto } from './dto/create-number-series.dto.js';
import type { UpdateNumberSeriesDto } from './dto/update-number-series.dto.js';
import {
  changeProblem,
  formatNumber,
  MAX_NUMBER_LENGTH,
  seriesProblem,
  type SeriesFormat,
} from './number-series-rules.js';
import {
  toNumberSeriesView,
  type NumberSeriesView,
} from './number-series-view.js';

const DOCUMENT_ORDER: SeriesDocument[] = [
  'QUOTATION',
  'SALES_INVOICE',
  'EXPORT_INVOICE',
  'PURCHASE',
  'RECEIPT',
  'PAYMENT',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'STOCK_JOURNAL',
  'SHIPMENT',
  'EXPENSE',
];

// Checks the series and that no other series has its document and year
// (caught here to name them; the unique index holds it too).
async function assertSeries(
  tx: Prisma.TransactionClient,
  series: SeriesFormat,
  id?: string,
) {
  const problem = seriesProblem(series);
  if (problem) throw new BadRequestException(problem);
  const same = await tx.numberSeries.findUnique({
    where: {
      document_financialYear: {
        document: series.document as SeriesDocument,
        financialYear: series.financialYear,
      },
    },
  });
  if (same && same.id !== id) {
    throw new ConflictException(
      `This document already has a series for ${series.financialYear}. Edit that one instead.`,
    );
  }
}

interface ClaimedRow {
  prefix: string;
  padding: number;
  lastIssued: number;
}

@Injectable()
export class NumberSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<NumberSeriesView[]> {
    const rows = await this.prisma.numberSeries.findMany();
    // Newest year first, then documents in the order a sale and a purchase run.
    return rows
      .sort(
        (a, b) =>
          b.financialYear.localeCompare(a.financialYear) ||
          DOCUMENT_ORDER.indexOf(a.document) - DOCUMENT_ORDER.indexOf(b.document),
      )
      .map(toNumberSeriesView);
  }

  async create(dto: CreateNumberSeriesDto): Promise<NumberSeriesView> {
    return this.prisma.$transaction(async (tx) => {
      const data = {
        document: dto.document,
        financialYear: dto.financialYear,
        prefix: dto.prefix,
        nextNumber: dto.nextNumber,
        padding: dto.padding,
      };
      await assertSeries(tx, data);
      return toNumberSeriesView(await tx.numberSeries.create({ data }));
    });
  }

  async update(id: string, dto: UpdateNumberSeriesDto): Promise<NumberSeriesView> {
    return this.prisma.$transaction(async (tx) => {
      // Locks the row, so a document claiming a number waits for this save.
      await tx.$queryRaw`SELECT 1 FROM "NumberSeries" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const stored = await tx.numberSeries.findUniqueOrThrow({ where: { id } });
      // Fields left out keep their stored value (definedFields).
      const next = {
        document: stored.document,
        financialYear: stored.financialYear,
        prefix: stored.prefix,
        nextNumber: stored.nextNumber,
        padding: stored.padding,
        ...definedFields(dto),
      };
      const problem = changeProblem(stored, next);
      if (problem) throw new ConflictException(problem);
      await assertSeries(tx, next, id);
      return toNumberSeriesView(
        await tx.numberSeries.update({ where: { id }, data: next }),
      );
    });
  }

  // A series a document has taken a number from is history: deleting it
  // would let a new series hand the same numbers out again.
  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.numberSeries.deleteMany({
      where: { id, lastIssued: 0 },
    });
    if (count === 0) {
      await this.prisma.numberSeries.findUniqueOrThrow({ where: { id } });
      throw new ConflictException(
        'Documents already carry numbers from this series, so it cannot be deleted',
      );
    }
  }

  /**
   * Takes the next number for a document dated `date`, inside the caller's
   * save transaction. One UPDATE … RETURNING increments and reads the row, so
   * two saves never get the same number; the row stays locked until the
   * transaction ends, and a save that fails rolls the number back, leaving no
   * gap. Throws 409 when the year has no series or the number has outgrown
   * 16 characters.
   */
  async claimNext(
    tx: Prisma.TransactionClient,
    document: SeriesDocument,
    date: string,
  ): Promise<string> {
    const financialYear = financialYearOf(date);
    const [claimed] = await tx.$queryRaw<ClaimedRow[]>`
      UPDATE "NumberSeries"
      SET "lastIssued" = "nextNumber", "nextNumber" = "nextNumber" + 1, "updatedAt" = now()
      WHERE "document" = ${document}::"SeriesDocument" AND "financialYear" = ${financialYear}
      RETURNING "prefix", "padding", "lastIssued"`;
    if (!claimed) {
      throw new ConflictException(
        `There is no number series for this document in ${financialYear}. Add one on Number series first.`,
      );
    }
    const number = formatNumber(claimed.prefix, claimed.lastIssued, claimed.padding);
    if (number.length > MAX_NUMBER_LENGTH) {
      throw new ConflictException(
        `${number} is longer than ${MAX_NUMBER_LENGTH} characters. Start a series with a shorter prefix.`,
      );
    }
    return number;
  }
}
