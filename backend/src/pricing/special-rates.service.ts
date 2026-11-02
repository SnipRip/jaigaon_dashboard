import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateSpecialRateDto } from './dto/create-special-rate.dto.js';
import type { ListSpecialRatesQueryDto } from './dto/list-special-rates-query.dto.js';
import type { UpdateSpecialRateDto } from './dto/update-special-rate.dto.js';
import {
  overlappingRate,
  specialRatePartyProblem,
  specialRateProblem,
} from './pricing-rules.js';
import { toSpecialRateView, type SpecialRateView } from './pricing-views.js';
import { assertTarget } from './rate-target-check.js';

type Draft = Omit<SpecialRateView, 'id'> & { id?: string };

const fail = (problem: string | null) => {
  if (problem) throw new BadRequestException(problem);
};

@Injectable()
export class SpecialRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSpecialRatesQueryDto): Promise<SpecialRateView[]> {
    const rates = await this.prisma.specialRate.findMany({
      where: {
        ...archivedFilter(query.includeArchived),
        partyId: query.partyId,
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });
    return rates.map(toSpecialRateView);
  }

  create(dto: CreateSpecialRateDto): Promise<SpecialRateView> {
    const draft: Draft = {
      partyId: dto.partyId,
      itemId: dto.itemId ?? null,
      categoryId: dto.categoryId ?? null,
      kind: dto.kind,
      value: dto.value,
      validFrom: dto.validFrom,
      validTill: dto.validTill ?? null,
      notes: dto.notes ?? null,
      isArchived: false,
    };
    return this.prisma.$transaction(async (tx) => {
      await this.check(tx, draft, true);
      return toSpecialRateView(
        await tx.specialRate.create({ data: this.row(draft) }),
      );
    });
  }

  update(id: string, dto: UpdateSpecialRateDto): Promise<SpecialRateView> {
    return this.prisma.$transaction(async (tx) => {
      const current = toSpecialRateView(
        await tx.specialRate.findUniqueOrThrow({ where: { id } }),
      );
      // Fields left out keep their stored value; null clears an optional one.
      const changes = Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      );
      const draft: Draft = { ...current, ...changes };
      // The customer is checked again only when it changes or the rate is
      // restored, so a rate of a customer archived since can still be archived.
      const partyChanged =
        draft.partyId !== current.partyId ||
        (current.isArchived && !draft.isArchived);
      await this.check(tx, draft, partyChanged);
      return toSpecialRateView(
        await tx.specialRate.update({ where: { id }, data: this.row(draft) }),
      );
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.specialRate.delete({ where: { id } });
  }

  private async check(
    tx: Prisma.TransactionClient,
    draft: Draft,
    checkParty: boolean,
  ) {
    fail(specialRateProblem(draft));
    await assertTarget(tx, draft);
    if (checkParty) {
      const party = await tx.party.findUnique({
        where: { id: draft.partyId },
        select: { isCustomer: true, isArchived: true },
      });
      if (!party) throw new BadRequestException('That customer does not exist');
      fail(specialRatePartyProblem(party));
    }
    if (draft.isArchived) return;
    const others = await tx.specialRate.findMany({
      where: {
        partyId: draft.partyId,
        itemId: draft.itemId,
        categoryId: draft.categoryId,
        isArchived: false,
      },
    });
    const clash = overlappingRate(draft, others.map(toSpecialRateView));
    if (clash) {
      throw new ConflictException(
        `This customer already has a rate for it from ${clash.validFrom}${clash.validTill ? ` till ${clash.validTill}` : ''}. End or archive that one first.`,
      );
    }
  }

  private row(draft: Draft) {
    return {
      partyId: draft.partyId,
      itemId: draft.itemId,
      categoryId: draft.categoryId,
      kind: draft.kind,
      value: draft.value,
      validFrom: dateOnly(draft.validFrom),
      validTill: draft.validTill ? dateOnly(draft.validTill) : null,
      notes: draft.notes,
      isArchived: draft.isArchived,
    };
  }
}
