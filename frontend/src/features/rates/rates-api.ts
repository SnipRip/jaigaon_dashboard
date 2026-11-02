// Calls for the pricing masters and the rate quote, and the conversion
// between the backend's shapes and the ones the Rates screen edits. No
// hooks here, so server components can import the paths.
import type { Item } from "@/features/items/types";
import { ITEMS_PATH } from "@/features/items/item-paths";
import { persistence, type Changes } from "@/features/masters/masters-api";
import type { MasterRecord } from "@/features/masters/record-master";
import { apiRequest } from "@/lib/api-client";
import type { PriceLevelView, QuantitySlabView, RateTargetView, SpecialRateView } from "@/types/pricing";
import type { PriceLevel, QuantitySlab, RateTarget, SpecialRate } from "./types";

export const PRICE_LEVELS_PATH = "/price-levels";
export const SPECIAL_RATES_PATH = "/special-rates";
export const QUANTITY_SLABS_PATH = "/quantity-slabs";
export const RATE_QUOTE_PATH = "/rates/quote";

const target = (view: RateTargetView): RateTarget => ({ itemId: view.itemId ?? undefined, categoryId: view.categoryId ?? undefined });

export const toPriceLevel = (view: PriceLevelView): PriceLevel => ({
  id: view.id,
  name: view.name,
  discountPct: view.discountPct,
  description: view.description ?? undefined,
  categoryDiscounts: view.categoryDiscounts,
  customerCount: view.customerCount,
  archived: view.isArchived,
});

export const toSpecialRate = (view: SpecialRateView): SpecialRate => ({
  id: view.id,
  customerId: view.partyId,
  ...target(view),
  kind: view.kind === "NET" ? "net" : "discount",
  value: view.value,
  validFrom: view.validFrom,
  validTill: view.validTill ?? undefined,
  notes: view.notes ?? undefined,
  archived: view.isArchived,
});

export const toQuantitySlab = (view: QuantitySlabView): QuantitySlab => ({
  id: view.id,
  ...target(view),
  minQuantity: view.minQuantity,
  discountPct: view.discountPct,
  archived: view.isArchived,
});

// The form picks an item or a category in one list; its value says which.
export const targetKey = (rate: RateTarget) => (rate.itemId ? `item:${rate.itemId}` : `category:${rate.categoryId}`);
const fromTargetKey = (key: unknown): RateTargetView => {
  const [kind, id] = String(key).split(":");
  return kind === "item" ? { itemId: id, categoryId: null } : { itemId: null, categoryId: id };
};

const levelBody = (changes: Changes) => ({
  name: changes.name,
  discountPct: changes.discountPct,
  description: changes.description ?? null,
});

const specialRateBody = (changes: Changes) => ({
  partyId: changes.customerId,
  ...fromTargetKey(changes.target),
  kind: String(changes.kind).toUpperCase(),
  value: changes.value,
  validFrom: changes.validFrom,
  validTill: changes.validTill ?? null,
  notes: changes.notes ?? null,
});

const slabBody = (changes: Changes) => ({
  ...fromTargetKey(changes.target),
  minQuantity: changes.minQuantity,
  discountPct: changes.discountPct,
});

/** `decorate` adds what the screen shows (a title, the form's target key) to each saved record. */
export const priceLevelPersistence = (onSaved: () => void) => persistence(PRICE_LEVELS_PATH, toPriceLevel, levelBody, onSaved);
export const specialRatePersistence = <R extends MasterRecord>(onSaved: () => void, decorate: (rate: SpecialRate) => R) =>
  persistence<SpecialRateView, R>(SPECIAL_RATES_PATH, (view) => decorate(toSpecialRate(view)), specialRateBody, onSaved);
export const slabPersistence = <R extends MasterRecord>(onSaved: () => void, decorate: (slab: QuantitySlab) => R) =>
  persistence<QuantitySlabView, R>(QUANTITY_SLABS_PATH, (view) => decorate(toQuantitySlab(view)), slabBody, onSaved);

/** Replaces the level's category discounts. */
export const saveCategoryDiscounts = (level: PriceLevel, rows: PriceLevel["categoryDiscounts"]) =>
  apiRequest<PriceLevelView>(`${PRICE_LEVELS_PATH}/${level.id}`, { method: "PATCH", body: { categoryDiscounts: rows } });

/** The item's own prices, edited from the Item prices tab (needs the Items permission). */
export const saveItemPrices = (item: Item, prices: Pick<Item, "mrp" | "costPrice" | "sellingPrice" | "minSellingPrice">) =>
  apiRequest(`${ITEMS_PATH}/${item.id}`, {
    method: "PATCH",
    body: { mrp: prices.mrp ?? null, costPrice: prices.costPrice, sellingPrice: prices.sellingPrice, minSellingPrice: prices.minSellingPrice ?? null },
  });

export function quotePath(query: { itemId: string; partyId?: string; quantity: number; date: string }) {
  const params = new URLSearchParams({ itemId: query.itemId, quantity: String(query.quantity), date: query.date });
  if (query.partyId) params.set("partyId", query.partyId);
  return `${RATE_QUOTE_PATH}?${params}`;
}
