import { toNumber } from '../common/decimal.js';
import type { ItemGroup } from '../generated/prisma/client.js';
import { readAttributes, type GroupAttribute } from '../items/item-rules.js';

export interface ItemGroupView {
  id: string;
  name: string;
  skuPrefix: string | null;
  categoryId: string;
  subCategoryId: string | null;
  brandId: string | null;
  description: string | null;
  attributes: GroupAttribute[];
  hsn: string | null;
  gstRatePct: number | null;
  defaultUnitId: string | null;
  isArchived: boolean;
  itemCount: number;
}

export const withItemCount = { _count: { select: { items: true } } } as const;

export const toItemGroupView = (
  group: ItemGroup & { _count: { items: number } },
): ItemGroupView => ({
  id: group.id,
  name: group.name,
  skuPrefix: group.skuPrefix,
  categoryId: group.categoryId,
  subCategoryId: group.subCategoryId,
  brandId: group.brandId,
  description: group.description,
  attributes: readAttributes(group.attributes),
  hsn: group.hsn,
  gstRatePct: toNumber(group.gstRatePct),
  defaultUnitId: group.defaultUnitId,
  isArchived: group.isArchived,
  itemCount: group._count.items,
});
