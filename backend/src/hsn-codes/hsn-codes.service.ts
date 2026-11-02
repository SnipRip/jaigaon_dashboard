import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateHsnCodeDto } from './dto/create-hsn-code.dto.js';
import type { HsnRateDto } from './dto/hsn-rate.dto.js';
import type { UpdateHsnCodeDto } from './dto/update-hsn-code.dto.js';
import {
  dateOnly,
  isoDate,
  toHsnCodeView,
  type HsnCodeView,
} from './hsn-code-view.js';
import {
  bestMatch,
  HSN_CODE_PATTERN,
  rateOn,
  SAC_CODE_PATTERN,
} from './hsn-rules.js';

const withRates = { rates: true } as const;

/** What a document needs from the master for one HSN on one date. */
export interface HsnLookup {
  code: string;
  kind: HsnCodeView['kind'];
  description: string;
  /** Undefined when the code has no rate yet on that date. */
  ratePct: number | undefined;
  cessPct: number | null;
  reverseCharge: boolean;
}

@Injectable()
export class HsnCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<HsnCodeView[]> {
    const codes = await this.prisma.hsnCode.findMany({
      orderBy: { code: 'asc' },
      include: withRates,
    });
    const counts = await this.itemCounts(codes);
    return codes.map((code) => toHsnCodeView(code, counts.get(code.code) ?? 0));
  }

  /** The master entry an HSN falls under and its rate on a date (today by default). */
  async lookup(
    hsn: string,
    date = isoDate(new Date()),
  ): Promise<HsnLookup | null> {
    const codes = await this.prisma.hsnCode.findMany({ include: withRates });
    const match = bestMatch(codes, hsn);
    if (!match) return null;
    const view = toHsnCodeView(match, 0);
    return {
      code: view.code,
      kind: view.kind,
      description: view.description,
      ratePct: rateOn(view.rates, date),
      cessPct: view.cessPct,
      reverseCharge: view.reverseCharge,
    };
  }

  async create(dto: CreateHsnCodeDto): Promise<HsnCodeView> {
    const pattern = dto.kind === 'HSN' ? HSN_CODE_PATTERN : SAC_CODE_PATTERN;
    if (!pattern.test(dto.code)) {
      throw new BadRequestException(
        dto.kind === 'HSN'
          ? 'An HSN code is 4, 6 or 8 digits'
          : 'A SAC code is 4 or 6 digits starting with 99',
      );
    }
    const code = await this.prisma.hsnCode.create({
      data: {
        code: dto.code,
        kind: dto.kind,
        description: dto.description,
        cessPct: dto.cessPct ?? null,
        reverseCharge: dto.reverseCharge ?? false,
        notes: dto.notes ?? null,
        rates: {
          create: {
            ratePct: dto.ratePct,
            effectiveFrom: dateOnly(dto.effectiveFrom),
          },
        },
      },
      include: withRates,
    });
    return this.view(code.id);
  }

  async update(id: string, dto: UpdateHsnCodeDto): Promise<HsnCodeView> {
    await this.prisma.hsnCode.update({ where: { id }, data: dto });
    return this.view(id);
  }

  // A rate on a date that already has one replaces it (a typo fix);
  // otherwise it is added, and documents before its date keep the old rate.
  async addRate(id: string, dto: HsnRateDto): Promise<HsnCodeView> {
    const effectiveFrom = dateOnly(dto.effectiveFrom);
    await this.prisma.hsnRate.upsert({
      where: { hsnCodeId_effectiveFrom: { hsnCodeId: id, effectiveFrom } },
      create: { hsnCodeId: id, ratePct: dto.ratePct, effectiveFrom },
      update: { ratePct: dto.ratePct },
    });
    return this.view(id);
  }

  async removeRate(id: string, rateId: string): Promise<HsnCodeView> {
    const rates = await this.prisma.hsnRate.findMany({
      where: { hsnCodeId: id },
    });
    if (!rates.some((rate) => rate.id === rateId))
      throw new NotFoundException('Rate not found');
    if (rates.length === 1)
      throw new BadRequestException('A code needs at least one rate');
    await this.prisma.hsnRate.delete({ where: { id: rateId } });
    return this.view(id);
  }

  // Items keep their HSN as text, so the database cannot stop this delete;
  // the check here does.
  async remove(id: string): Promise<void> {
    const view = await this.view(id);
    if (view.itemCount > 0) {
      throw new ConflictException(
        view.itemCount === 1
          ? `1 item takes its GST from ${view.code}. Change its HSN first.`
          : `${view.itemCount} items take their GST from ${view.code}. Change their HSN first.`,
      );
    }
    await this.prisma.hsnCode.delete({ where: { id } });
  }

  private async view(id: string): Promise<HsnCodeView> {
    const code = await this.prisma.hsnCode.findUniqueOrThrow({
      where: { id },
      include: withRates,
    });
    // Usage depends on the other codes too: an item under 721420 does not count for 7214.
    const all = await this.prisma.hsnCode.findMany({ select: { code: true } });
    const counts = await this.itemCounts(all);
    return toHsnCodeView(code, counts.get(code.code) ?? 0);
  }

  /** Master code → items whose HSN falls under it. */
  private async itemCounts(
    codes: { code: string }[],
  ): Promise<Map<string, number>> {
    const groups = await this.prisma.item.groupBy({
      by: ['hsn'],
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const group of groups) {
      const match = bestMatch(codes, group.hsn);
      if (match)
        counts.set(
          match.code,
          (counts.get(match.code) ?? 0) + group._count._all,
        );
    }
    return counts;
  }
}
