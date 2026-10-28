// Pure rules of the item master: inheritance of HSN / GST / unit down the
// category tree, variant generation for item groups, stock status and search.
// No React here, so the backend can port these one to one.
import { findHsn, latestRate } from "@/features/hsn/hsn-rules";
import type { HsnCode } from "@/features/hsn/types";
import type {
  Category,
  GroupAttribute,
  Item,
  ItemDefaults,
  ItemGroup,
  ResolvedItemDefaults,
  ResolvedValue,
  SubCategory,
} from "./types";

export interface ItemCatalog {
  /** The HSN / SAC master. When an item's HSN is in it, its GST rate comes from there. */
  hsnCodes?: HsnCode[];
  categories: Category[];
  groups: ItemGroup[];
  items: Item[];
}

export const findCategory = (catalog: ItemCatalog, id: string) => catalog.categories.find((category) => category.id === id);

export function findSubCategory(catalog: ItemCatalog, categoryId: string, subCategoryId?: string): SubCategory | undefined {
  if (!subCategoryId) return undefined;
  return findCategory(catalog, categoryId)?.subCategories.find((sub) => sub.id === subCategoryId);
}

export const findGroup = (catalog: ItemCatalog, id?: string) => (id ? catalog.groups.find((group) => group.id === id) : undefined);

type Level = { source: ResolvedValue<unknown>["source"]; defaults: ItemDefaults | undefined };

function resolve<K extends keyof ItemDefaults>(levels: Level[], key: K): ResolvedValue<NonNullable<ItemDefaults[K]>> {
  for (const level of levels) {
    const value = level.defaults?.[key];
    if (value !== undefined && value !== "") return { value: value as NonNullable<ItemDefaults[K]>, source: level.source };
  }
  return { value: undefined, source: "none" };
}

/**
 * The defaults that apply at some point in the tree. The nearest level that
 * sets a value wins: item, then group, then sub-category, then category.
 */
export function resolveDefaults(
  catalog: ItemCatalog,
  place: { categoryId: string; subCategoryId?: string; groupId?: string },
  own?: ItemDefaults,
): ResolvedItemDefaults {
  const levels: Level[] = [
    { source: "item", defaults: own },
    { source: "group", defaults: findGroup(catalog, place.groupId)?.defaults },
    { source: "sub-category", defaults: findSubCategory(catalog, place.categoryId, place.subCategoryId)?.defaults },
    { source: "category", defaults: findCategory(catalog, place.categoryId)?.defaults },
  ];
  const hsn = resolve(levels, "hsn");
  // GST follows the HSN code: the master's rate beats any category default,
  // and only a rate set on the item itself overrides it.
  const masterRate = findHsn(catalog.hsnCodes ?? [], hsn.value);
  const ownRate = own?.gstRatePct;
  const gstRatePct: ResolvedValue<number> =
    ownRate !== undefined
      ? { value: ownRate, source: "item" }
      : masterRate && latestRate(masterRate) !== undefined
        ? { value: latestRate(masterRate), source: "hsn" }
        : resolve(levels, "gstRatePct");
  return { hsn, gstRatePct, unit: resolve(levels, "unit") };
}

export const resolveItemDefaults = (catalog: ItemCatalog, item: Item) => resolveDefaults(catalog, item, item.overrides);

export function categoryPath(catalog: ItemCatalog, categoryId: string, subCategoryId?: string): string {
  const category = findCategory(catalog, categoryId);
  const sub = findSubCategory(catalog, categoryId, subCategoryId);
  return [category?.name, sub?.name].filter(Boolean).join(" › ");
}

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(item: Pick<Item, "stock" | "reorderLevel">): StockStatus {
  if (item.stock <= 0) return "out";
  if (item.stock <= item.reorderLevel) return "low";
  return "ok";
}

/** Every combination of the attributes' options, in the order given. */
export function generateVariants(attributes: GroupAttribute[]): Record<string, string>[] {
  const usable = attributes.filter((attribute) => attribute.name.trim() && attribute.options.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Record<string, string>[]>(
    (combinations, attribute) =>
      combinations.flatMap((combination) => attribute.options.map((option) => ({ ...combination, [attribute.name]: option }))),
    [{}],
  );
}

export const variantName = (groupName: string, values: Record<string, string>) =>
  [groupName.trim(), ...Object.values(values)].filter(Boolean).join(" ");

/** "IS-TMT" + { Size: "12 mm" } → "IS-TMT-12MM". Editable afterwards. */
export function variantSku(prefix: string, values: Record<string, string>): string {
  const parts = Object.values(values).map((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  return [prefix.trim().toUpperCase(), ...parts].filter(Boolean).join("-");
}

export function matchesItemSearch(catalog: ItemCatalog, item: Item, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item.name,
    item.sku,
    item.brand,
    findGroup(catalog, item.groupId)?.name,
    categoryPath(catalog, item.categoryId, item.subCategoryId),
    resolveItemDefaults(catalog, item).hsn.value,
    ...Object.values(item.attributeValues ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/** Item counts keyed by category id and by sub-category id. */
export function countItems(items: Item[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    if (item.subCategoryId) counts.set(item.subCategoryId, (counts.get(item.subCategoryId) ?? 0) + 1);
  }
  return counts;
}

export const SOURCE_LABEL: Record<ResolvedValue<unknown>["source"], string> = {
  item: "Set on this item",
  hsn: "From HSN master",
  group: "From item group",
  "sub-category": "From sub-category",
  category: "From category",
  none: "Not set",
};
