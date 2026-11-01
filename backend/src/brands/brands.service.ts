import { Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Brand } from '../generated/prisma/client.js';
import type { CreateBrandDto } from './dto/create-brand.dto.js';
import type { UpdateBrandDto } from './dto/update-brand.dto.js';

export type BrandView = Brand & { itemCount: number };

const withItemCount = { _count: { select: { items: true } } } as const;

const toView = ({ _count, ...brand }: Brand & { _count: { items: number } }): BrandView => ({
  ...brand,
  itemCount: _count.items,
});

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<BrandView[]> {
    const brands = await this.prisma.brand.findMany({
      where: archivedFilter(includeArchived),
      orderBy: { name: 'asc' },
      include: withItemCount,
    });
    return brands.map(toView);
  }

  async create(dto: CreateBrandDto): Promise<BrandView> {
    return toView(await this.prisma.brand.create({ data: dto, include: withItemCount }));
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandView> {
    return toView(
      await this.prisma.brand.update({ where: { id }, data: dto, include: withItemCount }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.prisma.brand.delete({ where: { id } });
  }
}
