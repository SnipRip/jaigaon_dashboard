import { toNumber } from '../common/decimal.js';
import type { ItemCategory } from '../generated/prisma/client.js';

export interface SubCategoryView {
  id: string;
  name: string;
  parentId: string | null;
  hsn: string | null;
  gstRatePct: number | null;
  defaultUnitId: string | null;
  sortOrder: number;
  isArchived: boolean;
}

export interface CategoryView extends SubCategoryView {
  subCategories: SubCategoryView[];
}

export const toSubCategoryView = (row: ItemCategory): SubCategoryView => ({
  id: row.id,
  name: row.name,
  parentId: row.parentId,
  hsn: row.hsn,
  gstRatePct: toNumber(row.gstRatePct),
  defaultUnitId: row.defaultUnitId,
  sortOrder: row.sortOrder,
  isArchived: row.isArchived,
});

/** Flat rows → categories with their sub-categories, in the rows' order. */
export function toCategoryTree(rows: ItemCategory[]): CategoryView[] {
  const tree = rows
    .filter((row) => row.parentId === null)
    .map((row) => ({ ...toSubCategoryView(row), subCategories: [] as SubCategoryView[] }));
  const byId = new Map(tree.map((category) => [category.id, category]));
  for (const row of rows) {
    if (row.parentId) byId.get(row.parentId)?.subCategories.push(toSubCategoryView(row));
  }
  return tree;
}
