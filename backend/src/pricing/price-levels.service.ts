import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CategoryDiscountDto,
  CreatePriceLevelDto,
} from './dto/create-price-level.dto.js';
import type { UpdatePriceLevelDto } from './dto/update-price-level.dto.js';
import { levelDiscountProblem } from './pricing-rules.js';
import {
  priceLevelInclude,
  toPriceLevelView,
  type PriceLevelView,
} from './pricing-views.js';

function check(
  discountPct: number | undefined,
  rows: CategoryDiscountDto[] = [],
) {
  for (const pct of [discountPct, ...rows.map((row) => row.discountPct)]) {
    const problem = pct === undefined ? null : levelDiscountProblem(pct);
    if (problem) throw new BadRequestException(problem);
  }
  if (new Set(rows.map((row) => row.categoryId)).size !== rows.length) {
    throw new BadRequestException('Each category appears once on a level');
  }
}

@Injectable()
export class PriceLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<PriceLevelView[]> {
    const levels = await this.prisma.priceLevel.findMany({
      where: archivedFilter(includeArchived),
      orderBy: { name: 'asc' },
      include: priceLevelInclude,
    });
    return levels.map(toPriceLevelView);
  }

  async create(dto: CreatePriceLevelDto): Promise<PriceLevelView> {
    const { categoryDiscounts, ...fields } = dto;
    check(dto.discountPct, categoryDiscounts);
    const level = await this.prisma.priceLevel.create({
      data: {
        ...fields,
        categoryDiscounts: categoryDiscounts
          ? { create: categoryDiscounts }
          : undefined,
      },
      include: priceLevelInclude,
    });
    return toPriceLevelView(level);
  }

  update(id: string, dto: UpdatePriceLevelDto): Promise<PriceLevelView> {
    const { categoryDiscounts, ...fields } = dto;
    check(dto.discountPct, categoryDiscounts);
    return this.prisma.$transaction(async (tx) => {
      if (categoryDiscounts) {
        await tx.priceLevelDiscount.deleteMany({ where: { priceLevelId: id } });
      }
      const level = await tx.priceLevel.update({
        where: { id },
        data: {
          ...fields,
          categoryDiscounts: categoryDiscounts
            ? { create: categoryDiscounts }
            : undefined,
        },
        include: priceLevelInclude,
      });
      return toPriceLevelView(level);
    });
  }

  // A level with customers on it is refused by the database (409: archive it).
  async remove(id: string): Promise<void> {
    await this.prisma.priceLevel.delete({ where: { id } });
  }
}
