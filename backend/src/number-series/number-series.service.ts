import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  dateOnly,
  formatDate,
  isoDate,
  todayInIndia,
} from '../common/dates.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import type { NumberFormat, Prisma } from '../generated/prisma/client.js';
import type { NumberedKind, NumberReset } from '../generated/prisma/enums.js';
import type { CreateNumberFormatDto } from './dto/create-number-format.dto.js';
import type { UpdateNumberFormatDto } from './dto/update-number-format.dto.js';
import type { UpdateNumberSeriesDto } from './dto/update-number-series.dto.js';
import {
  numberProblem,
  parsePattern,
  patternProblem,
  periodOf,
  renderNumber,
  uniqueWithinOf,
  type PatternPart,
} from './number-pattern.js';
import {
  toIssuedNumberView,
  toNumberFormatView,
  type ClaimedNumber,
  type IssuedNumberView,
  type IssuedSummary,
  type NumberSeriesView,
} from './number-series-view.js';
import { KIND_ORDER, KIND_RULES } from './numbered-kinds.js';

type Tx = Prisma.TransactionClient;
type FormatFields = Pick<
  CreateNumberFormatDto,
  'applicableFrom' | 'pattern' | 'startNumber' | 'reset'
>;

/** A number skipped this many times in a row (all typed by hand) means something is wrong. */
const MAX_SKIPS = 1000;

/** The format in force on a date: the latest one starting on or before it. */
const formatOn = <F extends Pick<NumberFormat, 'applicableFrom'>>(
  formats: F[],
  date: string,
) =>
  formats
    .filter((format) => isoDate(format.applicableFrom) <= date)
    .sort((a, b) => b.applicableFrom.getTime() - a.applicableFrom.getTime())[0];

/** A format's first period starts at its starting number; every later one at 1. */
const firstNumberOf = (
  format: Pick<NumberFormat, 'applicableFrom' | 'reset' | 'startNumber'>,
  period: string,
) =>
  periodOf(format.reset, isoDate(format.applicableFrom)) === period
    ? format.startNumber
    : 1;

const partsOf = (pattern: string) => parsePattern(pattern) as PatternPart[];

@Injectable()
export class NumberSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    date = todayInIndia(),
    configuredOnly = false,
  ): Promise<NumberSeriesView[]> {
    const [series, issuedPerFormat, summaries] = await Promise.all([
      this.prisma.numberSeries.findMany({
        include: { formats: { include: { counters: true } } },
      }),
      this.prisma.issuedNumber.groupBy({
        by: ['formatId'],
        _count: { _all: true },
      }),
      this.summaries(date),
    ]);
    const issuedCount = new Map(
      issuedPerFormat.map((row) => [row.formatId, row._count._all]),
    );
    return series
      .filter((row) => !configuredOnly || row.formats.length > 0)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .map((row) => {
        const current = formatOn(row.formats, date);
        const period = current && periodOf(current.reset, date);
        const counter = current?.counters.find(
          (candidate) => candidate.period === period,
        );
        const uniqueWithin = uniqueWithinOf(row.kind, date);
        return {
          id: row.id,
          kind: row.kind,
          method: row.method,
          tallyVoucherType: row.tallyVoucherType,
          formats: row.formats
            .sort(
              (a, b) => b.applicableFrom.getTime() - a.applicableFrom.getTime(),
            )
            .map((format) =>
              toNumberFormatView(format, issuedCount.get(format.id) ?? 0),
            ),
          current:
            current && period
              ? {
                  formatId: current.id,
                  next: renderNumber(
                    partsOf(current.pattern),
                    date,
                    counter?.nextNumber ?? firstNumberOf(current, period),
                  ),
                }
              : null,
          issued: summaries.get(`${row.kind} ${uniqueWithin}`) ?? {
            period: uniqueWithin,
            total: 0,
            cancelled: 0,
            first: null,
            last: null,
          },
        };
      });
  }

  // Per kind, for the date's financial year (and all time for master codes):
  // how many numbers, how many cancelled, the first and the last.
  private async summaries(date: string): Promise<Map<string, IssuedSummary>> {
    const year = uniqueWithinOf('SALES_INVOICE', date);
    const rows = await this.prisma.$queryRaw<
      (IssuedSummary & { kind: NumberedKind })[]
    >`
      SELECT "kind", "uniqueWithin" AS "period",
        count(*)::int AS "total",
        (count(*) FILTER (WHERE "status" = 'CANCELLED'))::int AS "cancelled",
        (array_agg("number" ORDER BY "createdAt", "sequence"))[1] AS "first",
        (array_agg("number" ORDER BY "createdAt" DESC, "sequence" DESC))[1] AS "last"
      FROM "IssuedNumber"
      WHERE "uniqueWithin" IN (${year}, 'ALL')
      GROUP BY "kind", "uniqueWithin"`;
    return new Map(
      rows.map(({ kind, ...summary }) => [
        `${kind} ${summary.period}`,
        summary,
      ]),
    );
  }

  async update(
    id: string,
    dto: UpdateNumberSeriesDto,
  ): Promise<NumberSeriesView> {
    await this.prisma.numberSeries.update({
      where: { id },
      data: definedFields(dto),
    });
    return this.viewOf(id);
  }

  async addFormat(
    seriesId: string,
    dto: CreateNumberFormatDto,
  ): Promise<NumberSeriesView> {
    await this.prisma.$transaction(async (tx) => {
      const series = await this.lockSeries(tx, seriesId);
      await this.assertFormat(tx, series.kind, seriesId, dto);
      await tx.numberFormat.create({ data: { seriesId, ...toFormatRow(dto) } });
    });
    return this.viewOf(seriesId);
  }

  async updateFormat(
    seriesId: string,
    formatId: string,
    dto: UpdateNumberFormatDto,
  ): Promise<NumberSeriesView> {
    await this.prisma.$transaction(async (tx) => {
      const series = await this.lockSeries(tx, seriesId);
      const stored = await this.unlockedFormat(tx, seriesId, formatId);
      // Fields left out keep their stored value (definedFields).
      const next = {
        applicableFrom: isoDate(stored.applicableFrom),
        pattern: stored.pattern,
        startNumber: stored.startNumber,
        reset: stored.reset,
        ...definedFields(dto),
      };
      await this.assertFormat(tx, series.kind, seriesId, next, formatId);
      await tx.numberFormat.update({
        where: { id: formatId },
        data: toFormatRow(next),
      });
    });
    return this.viewOf(seriesId);
  }

  async removeFormat(
    seriesId: string,
    formatId: string,
  ): Promise<NumberSeriesView> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockSeries(tx, seriesId);
      await this.unlockedFormat(tx, seriesId, formatId);
      await tx.numberFormat.delete({ where: { id: formatId } });
    });
    return this.viewOf(seriesId);
  }

  /** The newest 500 numbers of a kind in a financial year (master codes: all), newest first. */
  async issued(
    seriesId: string,
    financialYear?: string,
  ): Promise<IssuedNumberView[]> {
    const { kind } = await this.prisma.numberSeries.findUniqueOrThrow({
      where: { id: seriesId },
    });
    const rows = await this.prisma.issuedNumber.findMany({
      where: {
        kind,
        uniqueWithin: KIND_RULES[kind].uniquePerYear
          ? (financialYear ?? uniqueWithinOf(kind, todayInIndia()))
          : 'ALL',
      },
      orderBy: [{ createdAt: 'desc' }, { sequence: 'desc' }],
      take: 500,
    });
    return rows.map(toIssuedNumberView);
  }

  /** The number a save on `date` would take, without taking it. Null when typed by hand or no format is set. */
  async preview(
    kind: NumberedKind,
    date: string,
  ): Promise<{ number: string | null; method: string }> {
    const series = await this.prisma.numberSeries.findUniqueOrThrow({
      where: { kind },
      include: { formats: { include: { counters: true } } },
    });
    const format = formatOn(series.formats, date);
    if (!format || series.method === 'MANUAL')
      return { number: null, method: series.method };
    const period = periodOf(format.reset, date);
    const counter = format.counters.find(
      (candidate) => candidate.period === period,
    );
    return {
      number: renderNumber(
        partsOf(format.pattern),
        date,
        counter?.nextNumber ?? firstNumberOf(format, period),
      ),
      method: series.method,
    };
  }

  /**
   * Gives a document or master record its number, inside the caller's save
   * transaction. Without `typed`, the format in force on `date` gives the next
   * running number: one INSERT … ON CONFLICT DO UPDATE … RETURNING bumps the
   * counter, so concurrent saves never share a number, and the counter row
   * stays locked until the save commits; a failed save rolls it back, leaving
   * no gap. A number someone typed earlier is skipped. With `typed` (allowed
   * unless the method is Automatic) that number is checked and recorded.
   * Every number goes into the register, whose unique index refuses a
   * duplicate within the year (for ever for master codes).
   */
  async issue(
    tx: Tx,
    kind: NumberedKind,
    date: string,
    options: { typed?: string; documentId?: string } = {},
  ): Promise<ClaimedNumber> {
    const rules = KIND_RULES[kind];
    // Shared: claims run side by side, but wait for a format change (lockSeries).
    await tx.$queryRaw`SELECT 1 FROM "NumberSeries" WHERE "kind" = ${kind}::"NumberedKind" FOR SHARE`;
    const series = await tx.numberSeries.findUniqueOrThrow({
      where: { kind },
      include: { formats: true },
    });
    const typed = options.typed?.trim().toUpperCase();
    const record = (
      number: string,
      formatId: string | null,
      sequence: number | null,
    ) =>
      tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "IssuedNumber" ("id", "kind", "scope", "uniqueWithin", "number", "formatId", "sequence", "documentDate", "documentId")
        VALUES (gen_random_uuid(), ${kind}::"NumberedKind", ${rules.scope}, ${uniqueWithinOf(kind, date)}, ${number},
          ${formatId}::uuid, ${sequence}, ${date}::date, ${options.documentId ?? null}::uuid)
        ON CONFLICT ("scope", "uniqueWithin", "number") DO NOTHING
        RETURNING "id"`;

    if (typed !== undefined) {
      if (series.method === 'AUTOMATIC') {
        throw new BadRequestException(
          `${capitalised(rules.label)} numbers are automatic. Leave the number blank.`,
        );
      }
      const problem = numberProblem(kind, typed);
      if (problem) throw new BadRequestException(problem);
      const [row] = await record(typed, null, null);
      if (!row)
        throw new ConflictException(duplicateMessage(typed, kind, date));
      return { id: row.id, number: typed };
    }

    if (series.method === 'MANUAL') {
      throw new BadRequestException(
        `Enter the number: ${rules.label} numbers are typed by hand.`,
      );
    }
    const format = formatOn(series.formats, date);
    if (!format) {
      throw new ConflictException(
        `No ${rules.label} number format is in force on ${formatDate(date)}. Add one on Number series first.`,
      );
    }
    const parts = partsOf(format.pattern);
    const period = periodOf(format.reset, date);
    for (let skips = 0; skips < MAX_SKIPS; skips++) {
      const [{ sequence }] = await tx.$queryRaw<{ sequence: number }[]>`
        INSERT INTO "NumberCounter" ("formatId", "period", "nextNumber")
        VALUES (${format.id}::uuid, ${period}, ${firstNumberOf(format, period) + 1})
        ON CONFLICT ("formatId", "period") DO UPDATE SET "nextNumber" = "NumberCounter"."nextNumber" + 1
        RETURNING "nextNumber" - 1 AS "sequence"`;
      const number = renderNumber(parts, date, sequence);
      const problem = numberProblem(kind, number);
      if (problem)
        throw new ConflictException(
          `${problem}. Add a new format with room for more numbers.`,
        );
      const [row] = await record(number, format.id, sequence);
      if (row) return { id: row.id, number };
    }
    throw new ConflictException(
      `The next ${MAX_SKIPS} ${rules.label} numbers are all taken. Add a new format.`,
    );
  }

  /** Cancels an issued number inside the caller's transaction. It stays in the register and is never reused. */
  async cancel(tx: Tx, issuedId: string): Promise<void> {
    const { count } = await tx.issuedNumber.updateMany({
      where: { id: issuedId, status: 'ISSUED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (count === 0)
      throw new NotFoundException(
        'That number is not issued, or is already cancelled',
      );
  }

  private async viewOf(id: string): Promise<NumberSeriesView> {
    const views = await this.list();
    const view = views.find((candidate) => candidate.id === id);
    if (!view) throw new NotFoundException('Record not found');
    return view;
  }

  // Format changes and claims of one kind wait for each other: a format
  // change locks the series row for update, a claim for share. Claims then
  // queue on their counter row.
  private async lockSeries(tx: Tx, id: string) {
    const [series] = await tx.$queryRaw<{ kind: NumberedKind }[]>`
      SELECT "kind" FROM "NumberSeries" WHERE "id" = ${id}::uuid FOR UPDATE`;
    if (!series) throw new NotFoundException('Record not found');
    return series;
  }

  private async unlockedFormat(tx: Tx, seriesId: string, formatId: string) {
    const format = await tx.numberFormat.findFirst({
      where: { id: formatId, seriesId },
    });
    if (!format) throw new NotFoundException('Record not found');
    if (await tx.issuedNumber.count({ where: { formatId } })) {
      throw new ConflictException(
        'This format has already given out numbers, so it cannot be changed or deleted. Add a new format from a later date instead.',
      );
    }
    return format;
  }

  // The pattern must suit the kind; one format per start date; and a format
  // may not start on or before a date that already has a number, or numbers
  // already issued would sit inside its period.
  private async assertFormat(
    tx: Tx,
    kind: NumberedKind,
    seriesId: string,
    format: FormatFields,
    id?: string,
  ) {
    const problem = patternProblem(kind, format.pattern, format.reset);
    if (problem) throw new BadRequestException(problem);
    const sameDay = await tx.numberFormat.findFirst({
      where: {
        seriesId,
        applicableFrom: dateOnly(format.applicableFrom),
        id: id ? { not: id } : undefined,
      },
    });
    if (sameDay) {
      throw new ConflictException(
        `There is already a format from ${formatDate(format.applicableFrom)}. Edit that one instead.`,
      );
    }
    const latest = await tx.issuedNumber.findFirst({
      where: { kind },
      orderBy: { documentDate: 'desc' },
    });
    if (latest && isoDate(latest.documentDate) >= format.applicableFrom) {
      throw new ConflictException(
        `Numbers are already issued up to ${formatDate(isoDate(latest.documentDate))} (${latest.number}). A new format must start after that.`,
      );
    }
  }
}

const toFormatRow = (
  format: FormatFields,
): {
  applicableFrom: Date;
  pattern: string;
  startNumber: number;
  reset: NumberReset;
} => ({
  applicableFrom: dateOnly(format.applicableFrom),
  pattern: format.pattern,
  startNumber: format.startNumber,
  reset: format.reset,
});

const capitalised = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const duplicateMessage = (number: string, kind: NumberedKind, date: string) =>
  KIND_RULES[kind].uniquePerYear
    ? `${number} is already used in ${uniqueWithinOf(kind, date)}`
    : `${number} is already used`;
