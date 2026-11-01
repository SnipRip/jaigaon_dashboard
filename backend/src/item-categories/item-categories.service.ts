import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateItemCategoryDto } from './dto/create-item-category.dto.js';
import type { UpdateItemCategoryDto } from './dto/update-item-category.dto.js';
import {
  toCategoryTree,
  toSubCategoryView,
  type CategoryView,
  type SubCategoryView,
} from './item-category-view.js';

@Injectable()
export class ItemCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async tree(includeArchived?: boolean): Promise<CategoryView[]> {
    const rows = await this.prisma.itemCategory.findMany({
      where: archivedFilter(includeArchived),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return toCategoryTree(rows);
  }

  async create(dto: CreateItemCategoryDto): Promise<SubCategoryView> {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.prisma.itemCategory.findUniqueOrThrow({ where: { id: parentId } });
      if (parent.parentId) {
        throw new BadRequestException('Only two levels: a sub-category cannot have sub-categories');
      }
    } else {
      await this.assertTopLevelNameFree(dto.name);
    }
    dto.parentId = parentId;
    return toSubCategoryView(await this.prisma.itemCategory.create({ data: dto }));
  }

  async update(id: string, dto: UpdateItemCategoryDto): Promise<SubCategoryView> {
    if (dto.name !== undefined) {
      const current = await this.prisma.itemCategory.findUniqueOrThrow({ where: { id } });
      if (!current.parentId) await this.assertTopLevelNameFree(dto.name, id);
    }
    return toSubCategoryView(await this.prisma.itemCategory.update({ where: { id }, data: dto }));
  }

  async remove(id: string): Promise<void> {
    await this.prisma.itemCategory.delete({ where: { id } });
  }

  // The (parentId, name) unique index ignores rows with no parent, because
  // Postgres treats NULLs as distinct; top-level names are checked here.
  private async assertTopLevelNameFree(name: string, exceptId?: string): Promise<void> {
    const clash = await this.prisma.itemCategory.findFirst({
      where: {
        parentId: null,
        name: { equals: name, mode: 'insensitive' },
        id: exceptId ? { not: exceptId } : undefined,
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException('That name is already used');
  }
}
