// The item master as the backend returns it (backend/src/units, brands,
// godowns, item-categories, item-groups, items). Records refer to each other
// by id; features/items/catalog-api.ts turns them into the screens' shapes.

export interface UnitView {
  id: string;
  symbol: string;
  name: string;
  kind: "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA";
  decimals: number;
  uqc: string;
  isArchived: boolean;
  /** Items with this as their own base unit. */
  itemCount: number;
}

export interface BrandView {
  id: string;
  name: string;
  categoryId: string | null;
  isAuthorised: boolean;
  notes: string | null;
  isArchived: boolean;
  itemCount: number;
}

export interface GodownView {
  id: string;
  name: string;
  address: string;
  kind: "STORE" | "YARD" | "SITE";
  isDefault: boolean;
  inCharge: string | null;
  phone: string | null;
  isArchived: boolean;
}

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

export interface ItemGroupView {
  id: string;
  name: string;
  skuPrefix: string | null;
  categoryId: string;
  subCategoryId: string | null;
  brandId: string | null;
  description: string | null;
  attributes: { name: string; options: string[] }[];
  hsn: string | null;
  gstRatePct: number | null;
  defaultUnitId: string | null;
  isArchived: boolean;
  itemCount: number;
}

export interface ItemView {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  subCategoryId: string | null;
  groupId: string | null;
  attributeValues: Record<string, string> | null;
  brandId: string | null;
  description: string | null;
  hsn: string;
  /** Overrides only; null inherits. */
  gstRatePct: number | null;
  unitId: string | null;
  /** GST reporting unit; null = the base unit. */
  reportingUnitId: string | null;
  weightKg: number | null;
  mrp: number | null;
  /** Landed rate of the newest batch; null before any stock. */
  lastLandedCost: number | null;
  /** Stock value ÷ quantity on hand; null with nothing in stock. */
  stockCost: number | null;
  preferredSupplier: string | null;
  reorderLevel: number;
  isArchived: boolean;
  createdAt: string;
  alternateUnits: { unitId: string; baseQuantity: number }[];
  openingStock: { godownId: string; quantity: number; value: number }[];
  stock: number;
  /** On hand per godown; godowns with none are left out. */
  stockByGodown: { godownId: string; quantity: number }[];
  /** The item's picture ids, the cover (oldest) first. */
  pictureIds: string[];
}
