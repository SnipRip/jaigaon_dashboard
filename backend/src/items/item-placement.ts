import { BadRequestException } from '@nestjs/common';
import type { ItemCategory, ItemGroup, Prisma } from '../generated/prisma/client.js';

export interface Placement {
  categoryId: string;
  subCategoryId?: string | null;
  groupId?: string | null;
}

export interface LoadedPlacement {
  category: ItemCategory;
  subCategory: ItemCategory | null;
  group: ItemGroup | null;
}

// Loads where an item or group sits and checks the levels agree: the
// category is top level, the sub-category belongs to it, and a group sits in
// the same category and sub-category as its items.
export async function loadPlacement(
  db: Prisma.TransactionClient,
  { categoryId, subCategoryId, groupId }: Placement,
): Promise<LoadedPlacement> {
  const category = await db.itemCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.parentId) throw new BadRequestException('Pick a category');

  const subCategory = subCategoryId
    ? await db.itemCategory.findUnique({ where: { id: subCategoryId } })
    : null;
  if (subCategoryId && subCategory?.parentId !== categoryId) {
    throw new BadRequestException('That sub-category is not under the chosen category');
  }

  const group = groupId ? await db.itemGroup.findUnique({ where: { id: groupId } }) : null;
  if (groupId) {
    if (!group) throw new BadRequestException('Item group not found');
    if (group.categoryId !== categoryId || group.subCategoryId !== (subCategoryId ?? null)) {
      throw new BadRequestException('An item must sit in the same category and sub-category as its group');
    }
  }
  return { category, subCategory, group };
}
