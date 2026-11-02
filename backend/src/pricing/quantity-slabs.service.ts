import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateQuantitySlabDto } from './dto/create-quantity-slab.dto.js';
import type { UpdateQuantitySlabDto } from './dto/update-quantity-slab.dto.js';
import { duplicateSlab, slabProblem } from './pricing-rules.js';
import { toQuantitySlabView, type QuantitySlabView } from './pricing-views.js';
import { assertTarget } from './rate-target-check.js';

type Draft = Omit<QuantitySlabView, 'id'> & { id?: string };

@Injectable()
export class QuantitySlabsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<QuantitySlabView[]> {
    const slabs = await this.prisma.quantitySlab.findMany({
      where: archivedFilter(includeArchived),
      orderBy: [{ createdAt: 'asc' }],
    });
    return slabs.map(toQuantitySlabView);
  }

  create(dto: CreateQuantitySlabDto): Promise<QuantitySlabView> {
    const draft: Draft = {
      itemId: dto.itemId ?? null,
      categoryId: dto.categoryId ?? null,
      minQuantity: dto.minQuantity,
      discountPct: dto.discountPct,
      isArchived: false,
    };
    return this.prisma.$transaction(async (tx) => {
      await this.check(tx, draft);
      return toQuantitySlabView(await tx.quantitySlab.create({ data: draft }));
    });
  }

  update(id: string, dto: UpdateQuantitySlabDto): Promise<QuantitySlabView> {
    return this.prisma.$transaction(async (tx) => {
      const current = toQuantitySlabView(
        await tx.quantitySlab.findUniqueOrThrow({ where: { id } }),
      );
      const changes = Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      );
      const { id: _id, ...draft }: Draft = { ...current, ...changes };
      await this.check(tx, { ...draft, id });
      return toQuantitySlabView(
        await tx.quantitySlab.update({ where: { id }, data: draft }),
      );
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.quantitySlab.delete({ where: { id } });
  }

  private async check(tx: Prisma.TransactionClient, draft: Draft) {
    const problem = slabProblem(draft);
    if (problem) throw new BadRequestException(problem);
    await assertTarget(tx, draft);
    if (draft.isArchived) return;
    const others = await tx.quantitySlab.findMany({
      where: {
        itemId: draft.itemId,
        categoryId: draft.categoryId,
        isArchived: false,
      },
    });
    if (duplicateSlab(draft, others.map(toQuantitySlabView))) {
      throw new ConflictException(
        'A slab from this quantity already exists for it. Edit that one.',
      );
    }
  }
}
