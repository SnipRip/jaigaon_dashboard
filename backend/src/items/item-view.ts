import { toNumber } from '../common/decimal.js';
import type { Item, ItemOpeningStock, ItemUnitConversion } from '../generated/prisma/client.js';
import { itemCostSource, itemCosts, stockByGodown, stockOnHand, type CostSource, type GodownSource, type ItemCosts } from './item-costs.js';

// An item as the API returns it: numbers instead of Decimal strings, and
// stock on hand worked out from its rows.
export interface ItemView extends ItemCosts {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  subCategoryId: string | null;
  groupId: string | null;
  attributeValues: Record<string, string> | null;
  brandId: string | null;
  description: string | null;
  hsn: string;
  gstRatePct: number | null;
  unitId: string | null;
  weightKg: number | null;
  mrp: number | null;
  preferredSupplier: string | null;
  reorderLevel: number;
  isArchived: boolean;
  createdAt: Date;
  alternateUnits: { unitId: string; baseQuantity: number }[];
  openingStock: { godownId: string; quantity: number; value: number }[];
  /** On hand in all godowns: opening stock less sales, plus what is left of each bill batch. */
  stock: number;
  /** On hand per godown; godowns with none are left out. */
  stockByGodown: { godownId: string; quantity: number }[];
  /** The item's picture ids, oldest (the cover) first; each goes into its picture URL. */
  pictureIds: string[];
}

export type ItemRow = Item & {
  alternateUnits: ItemUnitConversion[];
  openingStock: ItemOpeningStock[];
  stockBatches: CostSource['stockBatches'] & GodownSource['stockBatches'];
  pictures: { id: string }[];
};

// Only the picture ids: lists never read the bytes.
export const itemRowInclude = {
  alternateUnits: true,
  openingStock: true,
  stockBatches: itemCostSource.stockBatches,
  pictures: { select: { id: true }, orderBy: { createdAt: 'asc' } },
} as const;

export function toItemView(item: ItemRow): ItemView {
  const openingStock = item.openingStock.map((row) => ({
    godownId: row.godownId,
    quantity: toNumber(row.quantity),
    value: toNumber(row.value),
  }));
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
    groupId: item.groupId,
    attributeValues: item.attributeValues as Record<string, string> | null,
    brandId: item.brandId,
    description: item.description,
    hsn: item.hsn,
    gstRatePct: toNumber(item.gstRatePct),
    unitId: item.unitId,
    weightKg: toNumber(item.weightKg),
    mrp: toNumber(item.mrp),
    ...itemCosts(item),
    preferredSupplier: item.preferredSupplier,
    reorderLevel: toNumber(item.reorderLevel),
    isArchived: item.isArchived,
    createdAt: item.createdAt,
    alternateUnits: item.alternateUnits.map((row) => ({
      unitId: row.unitId,
      baseQuantity: toNumber(row.baseQuantity),
    })),
    openingStock,
    stock: stockOnHand(item),
    stockByGodown: stockByGodown(item),
    pictureIds: item.pictures.map((picture) => picture.id),
  };
}
