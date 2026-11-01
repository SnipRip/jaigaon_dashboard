import { Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Unit } from '../generated/prisma/client.js';
import type { CreateUnitDto } from './dto/create-unit.dto.js';
import type { UpdateUnitDto } from './dto/update-unit.dto.js';

/** A unit with the number of items using it as their own base unit. */
export type UnitView = Unit & { itemCount: number };

const withItemCount = { _count: { select: { items: true } } } as const;

const toView = ({ _count, ...unit }: Unit & { _count: { items: number } }): UnitView => ({
  ...unit,
  itemCount: _count.items,
});

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<UnitView[]> {
    const units = await this.prisma.unit.findMany({
      where: archivedFilter(includeArchived),
      orderBy: { symbol: 'asc' },
      include: withItemCount,
    });
    return units.map(toView);
  }

  async create(dto: CreateUnitDto): Promise<UnitView> {
    return toView(await this.prisma.unit.create({ data: dto, include: withItemCount }));
  }

  async update(id: string, dto: UpdateUnitDto): Promise<UnitView> {
    return toView(
      await this.prisma.unit.update({ where: { id }, data: dto, include: withItemCount }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.prisma.unit.delete({ where: { id } });
  }
}
