// The item master from the backend. The backend links records by id; the
// item screens work with unit symbols, brand names and godown names (all
// unique), so this file converts both ways and holds the save calls.
import { useMemo } from "react";
import useSWR from "swr";
import { BRANDS_PATH, GODOWNS_PATH, UNITS_PATH, withArchived } from "@/features/masters/masters-api";
import { apiGet, apiRequest } from "@/lib/api-client";
import type { BrandView, CategoryView, GodownView, ItemGroupView, ItemView, SubCategoryView, UnitView } from "@/types/item-master";
import type { CategoryDraft } from "./category-editor";
import type { ItemGroupFormValues } from "./item-group-schema";
import type { ItemCatalog } from "./item-rules";
import { CATEGORIES_PATH, ITEM_GROUPS_PATH, ITEMS_PATH } from "./item-paths";
import type { ItemFormValues } from "./item-schema";
import type { Category, Item, ItemDefaults, ItemGroup, StockMovement } from "./types";
import { NONE, type Overridable } from "./use-overrides";
import type { VariantLine } from "./variant-rows-table";


/** Everything the item screens read, loaded once and shared through SWR's cache. */
export interface ItemMasters {
  catalog: ItemCatalog;
  /** Archived ones included, so old records still show their names. Pickers use `active`. */
  units: UnitView[];
  brands: BrandView[];
  godowns: GodownView[];
  /** Item views by id, for the activity panel. */
  itemViews: Map<string, ItemView>;
}

export const active = <T extends { isArchived: boolean }>(records: T[]) => records.filter((record) => !record.isArchived);

const symbolOf = (units: UnitView[], id: string | null) => (id ? units.find((unit) => unit.id === id)?.symbol : undefined);
const brandNameOf = (brands: BrandView[], id: string | null) => (id ? brands.find((brand) => brand.id === id)?.name : undefined);

function defaultsOf(view: { hsn: string | null; gstRatePct: number | null; defaultUnitId: string | null }, units: UnitView[]): ItemDefaults {
  return { hsn: view.hsn ?? undefined, gstRatePct: view.gstRatePct ?? undefined, unit: symbolOf(units, view.defaultUnitId) };
}

const toCategory = (view: CategoryView, units: UnitView[]): Category => ({
  id: view.id,
  name: view.name,
  defaults: defaultsOf(view, units),
  subCategories: view.subCategories.map((sub: SubCategoryView) => ({ id: sub.id, name: sub.name, defaults: defaultsOf(sub, units) })),
});

const toGroup = (view: ItemGroupView, units: UnitView[], brands: BrandView[]): ItemGroup => ({
  id: view.id,
  name: view.name,
  skuPrefix: view.skuPrefix,
  categoryId: view.categoryId,
  subCategoryId: view.subCategoryId ?? undefined,
  brand: brandNameOf(brands, view.brandId),
  description: view.description ?? undefined,
  attributes: view.attributes,
  defaults: defaultsOf(view, units),
});

// HSN is always the item's own, so it sits with the overrides.
const toItem = (view: ItemView, units: UnitView[], brands: BrandView[]): Item => ({
  id: view.id,
  name: view.name,
  sku: view.sku,
  categoryId: view.categoryId,
  subCategoryId: view.subCategoryId ?? undefined,
  groupId: view.groupId ?? undefined,
  attributeValues: view.attributeValues ?? undefined,
  brand: brandNameOf(brands, view.brandId),
  description: view.description ?? undefined,
  overrides: { hsn: view.hsn, gstRatePct: view.gstRatePct ?? undefined, unit: symbolOf(units, view.unitId) },
  alternateUnits: view.alternateUnits.map((row) => ({ unit: symbolOf(units, row.unitId) ?? "", baseQuantity: row.baseQuantity })),
  weightKg: view.weightKg ?? undefined,
  mrp: view.mrp ?? undefined,
  sellingPrice: view.sellingPrice,
  minSellingPrice: view.minSellingPrice ?? undefined,
  costPrice: view.costPrice,
  preferredSupplier: view.preferredSupplier ?? undefined,
  stock: view.stock,
  reorderLevel: view.reorderLevel,
});

/**
 * Loads the item master. No HSN master is passed in the catalog yet (that
 * master is still sample data), so GST comes from the item, group or
 * category only, exactly as the backend resolves it.
 */
export function useItemMasters() {
  const units = useSWR<UnitView[]>(withArchived(UNITS_PATH), apiGet);
  const brands = useSWR<BrandView[]>(withArchived(BRANDS_PATH), apiGet);
  const godowns = useSWR<GodownView[]>(GODOWNS_PATH, apiGet);
  const categories = useSWR<CategoryView[]>(CATEGORIES_PATH, apiGet);
  const groups = useSWR<ItemGroupView[]>(ITEM_GROUPS_PATH, apiGet);
  const items = useSWR<ItemView[]>(ITEMS_PATH, apiGet);

  const masters = useMemo((): ItemMasters | undefined => {
    if (!units.data || !brands.data || !godowns.data || !categories.data || !groups.data || !items.data) return undefined;
    return {
      catalog: {
        categories: categories.data.map((view) => toCategory(view, units.data!)),
        groups: groups.data.map((view) => toGroup(view, units.data!, brands.data!)),
        items: items.data.map((view) => toItem(view, units.data!, brands.data!)),
      },
      units: units.data,
      brands: brands.data,
      godowns: godowns.data,
      itemViews: new Map(items.data.map((view) => [view.id, view])),
    };
  }, [units.data, brands.data, godowns.data, categories.data, groups.data, items.data]);

  const error = units.error ?? brands.error ?? godowns.error ?? categories.error ?? groups.error ?? items.error;
  // After a save: categories, groups and items change together; units and
  // brands carry item counts.
  const reload = async () => {
    await Promise.all([categories.mutate(), groups.mutate(), items.mutate(), units.mutate(), brands.mutate()]);
  };
  return { masters, error, reload };
}

/** The pickers' options: active records only. */
export const formOptions = (masters: ItemMasters) => ({
  brands: active(masters.brands).map((brand) => brand.name),
  units: active(masters.units).map((unit) => unit.symbol),
  godowns: active(masters.godowns).map((godown) => godown.name),
});

/** Opening stock per godown, the only stock movements stored so far. */
export function openingMovements(masters: ItemMasters, view: ItemView): StockMovement[] {
  return view.openingStock.map((row) => ({
    date: view.createdAt.slice(0, 10),
    kind: "Opening",
    reference: masters.godowns.find((godown) => godown.id === row.godownId)?.name ?? "Opening stock",
    quantity: row.quantity,
    rate: view.costPrice,
  }));
}

// Names in the forms → ids for the backend. Every name came from these lists.
const unitId = (masters: ItemMasters, symbol: string) => masters.units.find((unit) => unit.symbol === symbol)?.id ?? null;
const brandId = (masters: ItemMasters, name: string) =>
  name === NONE ? null : (masters.brands.find((brand) => brand.name === name)?.id ?? null);
const godownId = (masters: ItemMasters, name: string) => masters.godowns.find((godown) => godown.name === name)?.id;

const numberOrNull = (text: string) => (text.trim() === "" ? null : Number(text));
const textOrNull = (text: string) => text.trim() || null;
const subCategoryOf = (id: string) => (id === NONE ? null : id);
/** 1 / 3 kg-per-bag style ratios, to the 4 decimals the backend stores. */
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

function itemBody(masters: ItemMasters, values: ItemFormValues, overridden: ReadonlySet<Overridable>, isNew: boolean) {
  return {
    name: values.name,
    sku: values.sku,
    categoryId: values.categoryId,
    subCategoryId: subCategoryOf(values.subCategoryId),
    brandId: brandId(masters, values.brand),
    description: textOrNull(values.description),
    hsn: values.hsn,
    gstRatePct: overridden.has("gstRatePct") ? numberOrNull(values.gstOverride) : null,
    unitId: overridden.has("unit") && values.unitOverride ? unitId(masters, values.unitOverride) : null,
    alternateUnits: values.alternateUnits.map((row) => ({
      unitId: unitId(masters, row.unit),
      // Stored as "1 of this unit = N base units".
      baseQuantity: row.perBase ? round4(1 / Number(row.quantity)) : Number(row.quantity),
    })),
    weightKg: numberOrNull(values.weightKg),
    mrp: numberOrNull(values.mrp),
    sellingPrice: Number(values.sellingPrice),
    minSellingPrice: numberOrNull(values.minSellingPrice),
    costPrice: Number(values.costPrice),
    preferredSupplier: textOrNull(values.preferredSupplier),
    reorderLevel: numberOrNull(values.reorderLevel) ?? 0,
    // Opening stock is entered once, on a new item. Afterwards stock moves
    // through purchases, sales and adjustments.
    openingStock: isNew
      ? values.openingStock
          .filter((row) => Number(row.quantity) > 0)
          .map((row) => ({ godownId: godownId(masters, row.godown), quantity: Number(row.quantity) }))
      : undefined,
  };
}

export function saveItem(masters: ItemMasters, item: Item | undefined, values: ItemFormValues, overridden: ReadonlySet<Overridable>) {
  const body = itemBody(masters, values, overridden, !item);
  return item
    ? apiRequest<ItemView>(`${ITEMS_PATH}/${item.id}`, { method: "PATCH", body })
    : apiRequest<ItemView>(ITEMS_PATH, { method: "POST", body });
}

export function saveItemGroup(
  masters: ItemMasters,
  group: ItemGroup | undefined,
  values: ItemGroupFormValues,
  overridden: ReadonlySet<Overridable>,
  lines: VariantLine[],
) {
  const details = {
    name: values.name,
    skuPrefix: values.skuPrefix,
    brandId: brandId(masters, values.brand),
    description: textOrNull(values.description),
    hsn: overridden.has("hsn") ? textOrNull(values.hsnOverride) : null,
    gstRatePct: overridden.has("gstRatePct") ? numberOrNull(values.gstOverride) : null,
    defaultUnitId: overridden.has("unit") && values.unitOverride ? unitId(masters, values.unitOverride) : null,
    attributes: values.attributes,
    // A row that is already an item carries its id; its stock is not touched here.
    variants: lines.map((line) => ({
      id: line.existing?.id,
      attributeValues: line.values,
      sku: line.row.sku,
      costPrice: Number(line.row.costPrice),
      sellingPrice: Number(line.row.sellingPrice),
      openingStock: line.existing ? undefined : numberOrNull(line.row.openingStock),
      reorderLevel: numberOrNull(line.row.reorderLevel) ?? undefined,
    })),
  };
  return group
    ? apiRequest<ItemGroupView>(`${ITEM_GROUPS_PATH}/${group.id}`, { method: "PATCH", body: details })
    : apiRequest<ItemGroupView>(ITEM_GROUPS_PATH, {
        method: "POST",
        body: { ...details, categoryId: values.categoryId, subCategoryId: subCategoryOf(values.subCategoryId) },
      });
}

const categoryBody = (masters: ItemMasters, draft: CategoryDraft) => ({
  name: draft.name,
  hsn: draft.defaults.hsn ?? null,
  gstRatePct: draft.defaults.gstRatePct ?? null,
  defaultUnitId: draft.defaults.unit ? unitId(masters, draft.defaults.unit) : null,
});

/** A new category, or a sub-category when `parentId` is given. */
export const createCategory = (masters: ItemMasters, draft: CategoryDraft, parentId?: string) =>
  apiRequest<SubCategoryView>(CATEGORIES_PATH, { method: "POST", body: { ...categoryBody(masters, draft), parentId: parentId ?? null } });

export const updateCategory = (masters: ItemMasters, id: string, draft: CategoryDraft) =>
  apiRequest<SubCategoryView>(`${CATEGORIES_PATH}/${id}`, { method: "PATCH", body: categoryBody(masters, draft) });

export const deleteCategory = (id: string) => apiRequest(`${CATEGORIES_PATH}/${id}`, { method: "DELETE" });
