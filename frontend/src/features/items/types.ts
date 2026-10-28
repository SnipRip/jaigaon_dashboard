// Shapes of the item master (agent/masters-plan.md, "Item structure").
// Category → sub-category → optional item group → item. Only items hold
// stock; groups and categories carry defaults that items inherit.

/** Values a category, sub-category or group can set for everything below it. */
export interface ItemDefaults {
  hsn?: string;
  gstRatePct?: number;
  unit?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  defaults: ItemDefaults;
}

export interface Category {
  id: string;
  name: string;
  defaults: ItemDefaults;
  subCategories: SubCategory[];
}

/** An attribute of an item group and the options its variants are made from. */
export interface GroupAttribute {
  name: string;
  options: string[];
}

export interface ItemGroup {
  id: string;
  name: string;
  categoryId: string;
  subCategoryId?: string;
  brand?: string;
  description?: string;
  attributes: GroupAttribute[];
  defaults: ItemDefaults;
}

/** "1 bundle = 25 kg": one alternate unit and how many base units it holds. */
export interface UnitConversion {
  unit: string;
  baseQuantity: number;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  subCategoryId?: string;
  groupId?: string;
  /** Attribute name → option, for items in a group. */
  attributeValues?: Record<string, string>;
  brand?: string;
  description?: string;
  /** Overrides only. Missing values are inherited, see item-rules.ts. */
  overrides: ItemDefaults;
  alternateUnits: UnitConversion[];
  /** Kilograms per base unit, for truck load and e-way bill weight. */
  weightKg?: number;
  mrp?: number;
  sellingPrice: number;
  minSellingPrice?: number;
  costPrice: number;
  preferredSupplier?: string;
  stock: number;
  reorderLevel: number;
}

/** An inherited value with where it came from, for "From sub-category" hints. */
export interface ResolvedValue<T> {
  value: T | undefined;
  source: "item" | "hsn" | "group" | "sub-category" | "category" | "none";
}

export interface ResolvedItemDefaults {
  hsn: ResolvedValue<string>;
  gstRatePct: ResolvedValue<number>;
  unit: ResolvedValue<string>;
}

export type StockFilter = "all" | "low" | "out";

export interface StockMovement {
  date: string;
  kind: "Opening" | "Purchase" | "Sale" | "Adjustment";
  reference: string;
  party?: string;
  quantity: number;
  rate: number;
}
