// The item master from the backend. The backend links records by id; the
// item screens work with unit symbols, brand names and godown names (all
// unique), so this file converts both ways and holds the save calls.
import { useMemo } from "react";
import useSWR from "swr";
import { HSN_CODES_PATH, toHsnCode } from "@/features/hsn/hsn-api";
import { BRANDS_PATH, GODOWNS_PATH, UNITS_PATH, withArchived } from "@/features/masters/masters-api";
import { apiGet, apiRequest } from "@/lib/api-client";
import type { HsnCodeView } from "@/types/hsn";
import type { BrandView, CategoryView, GodownView, ItemGroupView, ItemView, SubCategoryView, UnitView } from "@/types/item-master";
import type { CategoryDraft } from "./category-editor";
import type { ItemGroupFormValues } from "./item-group-schema";
import type { ItemCatalog } from "./item-rules";
import type { PictureChanges } from "./item-picture-rules";
import { CATEGORIES_PATH, ITEM_GROUPS_PATH, ITEMS_PATH, itemPicturesPath, itemPictureUrl } from "./item-paths";
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
  skuPrefix: view.skuPrefix ?? undefined,
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
  sku: view.sku ?? undefined,
  categoryId: view.categoryId,
  subCategoryId: view.subCategoryId ?? undefined,
  groupId: view.groupId ?? undefined,
  attributeValues: view.attributeValues ?? undefined,
  brand: brandNameOf(brands, view.brandId),
  description: view.description ?? undefined,
  overrides: { hsn: view.hsn, gstRatePct: view.gstRatePct ?? undefined, unit: symbolOf(units, view.unitId) },
  alternateUnits: view.alternateUnits.map((row) => ({ unit: symbolOf(units, row.unitId) ?? "", baseQuantity: row.baseQuantity })),
  reportingUnit: symbolOf(units, view.reportingUnitId),
  weightKg: view.weightKg ?? undefined,
  mrp: view.mrp ?? undefined,
  lastLandedCost: view.lastLandedCost ?? undefined,
  stockCost: view.stockCost ?? undefined,
  preferredSupplier: view.preferredSupplier ?? undefined,
  stock: view.stock,
  stockByGodown: view.stockByGodown,
  reorderLevel: view.reorderLevel,
  pictures: view.pictureIds.map((id) => ({ id, url: itemPictureUrl(view.id, id) })),
});

/**
 * Loads the item master and the HSN master. An item's GST rate is its own,
 * else the rate in force today on its HSN code (hsnCodes), else the group,
 * sub-category or category default (item-rules.ts, resolveDefaults).
 */
export function useItemMasters() {
  const units = useSWR<UnitView[]>(withArchived(UNITS_PATH), apiGet);
  const brands = useSWR<BrandView[]>(withArchived(BRANDS_PATH), apiGet);
  const godowns = useSWR<GodownView[]>(GODOWNS_PATH, apiGet);
  const categories = useSWR<CategoryView[]>(CATEGORIES_PATH, apiGet);
  const groups = useSWR<ItemGroupView[]>(ITEM_GROUPS_PATH, apiGet);
  const items = useSWR<ItemView[]>(ITEMS_PATH, apiGet);
  const hsnCodes = useSWR<HsnCodeView[]>(HSN_CODES_PATH, apiGet);

  const masters = useMemo((): ItemMasters | undefined => {
    if (!units.data || !brands.data || !godowns.data || !categories.data || !groups.data || !items.data || !hsnCodes.data) {
      return undefined;
    }
    return {
      catalog: {
        categories: categories.data.map((view) => toCategory(view, units.data!)),
        groups: groups.data.map((view) => toGroup(view, units.data!, brands.data!)),
        items: items.data.map((view) => toItem(view, units.data!, brands.data!)),
        hsnCodes: hsnCodes.data.map(toHsnCode),
      },
      units: units.data,
      brands: brands.data,
      godowns: godowns.data,
      itemViews: new Map(items.data.map((view) => [view.id, view])),
    };
  }, [units.data, brands.data, godowns.data, categories.data, groups.data, items.data, hsnCodes.data]);

  const error =
    units.error ?? brands.error ?? godowns.error ?? categories.error ?? groups.error ?? items.error ?? hsnCodes.error;
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
    rate: row.quantity ? Math.round((row.value / row.quantity) * 100) / 100 : 0,
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
    sku: textOrNull(values.sku),
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
    // Only a unit still among the alternates; anything else reports in the base unit.
    reportingUnitId: values.alternateUnits.some((row) => row.unit === values.reportingUnit) ? unitId(masters, values.reportingUnit) : null,
    weightKg: numberOrNull(values.weightKg),
    mrp: numberOrNull(values.mrp),
    preferredSupplier: textOrNull(values.preferredSupplier),
    reorderLevel: numberOrNull(values.reorderLevel) ?? 0,
    // Opening stock is entered once, on a new item. Afterwards stock moves
    // through purchases, sales and adjustments.
    openingStock: isNew
      ? values.openingStock
          .filter((row) => Number(row.quantity) > 0)
          .map((row) => ({ godownId: godownId(masters, row.godown), quantity: Number(row.quantity), rate: Number(values.openingRate) }))
      : undefined,
  };
}

export function saveItem(masters: ItemMasters, item: Item | undefined, values: ItemFormValues, overridden: ReadonlySet<Overridable>) {
  const body = itemBody(masters, values, overridden, !item);
  return item
    ? apiRequest<ItemView>(`${ITEMS_PATH}/${item.id}`, { method: "PATCH", body })
    : apiRequest<ItemView>(ITEMS_PATH, { method: "POST", body });
}

/**
 * Removes, then uploads, the item's pictures one by one (removing first makes
 * room under the limit). Stops at the first failure and throws an ApiError;
 * `onProgress` gets what is still to do after each step, so a retry repeats
 * nothing that went through.
 */
export async function saveItemPictures(itemId: string, changes: PictureChanges, onProgress: (left: PictureChanges) => void) {
  const left = { added: [...changes.added], removed: [...changes.removed] };
  while (left.removed.length > 0) {
    await apiRequest(`${itemPicturesPath(itemId)}/${left.removed[0]}`, { method: "DELETE" });
    left.removed.shift();
    onProgress({ ...left });
  }
  while (left.added.length > 0) {
    const body = new FormData();
    body.append("file", left.added[0].file);
    await apiRequest<{ id: string }>(itemPicturesPath(itemId), { method: "POST", body });
    left.added.shift();
    onProgress({ ...left });
  }
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
    skuPrefix: textOrNull(values.skuPrefix),
    brandId: brandId(masters, values.brand),
    description: textOrNull(values.description),
    hsn: overridden.has("hsn") ? textOrNull(values.hsnOverride) : null,
    gstRatePct: overridden.has("gstRatePct") ? numberOrNull(values.gstOverride) : null,
    defaultUnitId: overridden.has("unit") && values.unitOverride ? unitId(masters, values.unitOverride) : null,
    attributes: values.attributes,
    // A row that is already an item carries its id; its stock is not touched here.
    // A standalone item being brought in goes under `adopt` instead.
    variants: lines.filter((line) => !line.adopting).map((line) => ({
      id: line.existing?.id,
      attributeValues: line.values,
      sku: textOrNull(line.row.sku),
      openingStock: line.existing ? undefined : numberOrNull(line.row.openingStock),
      openingRate: line.existing ? undefined : numberOrNull(line.row.openingRate),
      reorderLevel: numberOrNull(line.row.reorderLevel) ?? undefined,
    })),
  };
  const adopt = lines.filter((line) => line.adopting && line.existing).map((line) => ({ itemId: line.existing!.id, attributeValues: line.values }));
  return group
    ? apiRequest<ItemGroupView>(`${ITEM_GROUPS_PATH}/${group.id}`, { method: "PATCH", body: { ...details, adopt } })
    : apiRequest<ItemGroupView>(ITEM_GROUPS_PATH, {
        method: "POST",
        body: { ...details, adopt, categoryId: values.categoryId, subCategoryId: subCategoryOf(values.subCategoryId) },
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
