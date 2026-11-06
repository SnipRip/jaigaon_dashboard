// An item's stock in a godown, for the screens that take stock out of one
// (invoices, transfers, adjustments). No React. The backend works it out
// (items/item-costs.ts, stockByGodown) and refuses more than is there.
import type { Item } from "./types";

/** On hand in the godown; in all godowns before one is picked. */
export const stockIn = (item: Item, godownId: string): number =>
  godownId ? (item.stockByGodown?.find((row) => row.godownId === godownId)?.quantity ?? 0) : item.stock;

/** Items with stock in the godown (any godown before one is picked), plus those already on a line so a line never loses its item. */
export const itemsInStock = (items: Item[], godownId: string, keepIds: string[]): Item[] =>
  items.filter((item) => stockIn(item, godownId) > 0 || keepIds.includes(item.id));
