// What a row of the price list shows and saves while it is being edited.
// Typed cells are kept as text until saved; a typed margin sets the price
// from the cost (and keeps doing so if the cost changes), a typed price
// leaves the margin to follow. No React.
import type { PriceSheetRowView } from "@/types/price-list";
import type { PriceRowInput } from "./price-list-api";
import { effectivePrices, MARGIN_LIMITS, marginOf, priceFromMargin, priceProblem } from "./price-list-rules";

export interface RowEdit {
  price?: string;
  margin?: string;
  cost?: string;
  mrp?: string;
  min?: string;
}

export type EditField = keyof RowEdit;

export interface RowFigures {
  /** Null: no price on the day and none typed. */
  price: number | null;
  /** Null while the item has no cost (no stock yet and none typed). */
  margin: number | null;
  cost: number | null;
  mrp: number | null;
  min: number | null;
  /** What stops the row saving, if anything. */
  problem: string | null;
}

const NUMBER = /^\d+(\.\d{1,2})?$/;
const SIGNED = /^-?\d+(\.\d{1,2})?$/;

/** A typed cell as a number; blank is null (no figure of its own). */
const typed = (text: string | undefined, fallback: number | null, pattern = NUMBER): number | null | "bad" => {
  if (text === undefined) return fallback;
  const value = text.trim().replace(/,/g, "");
  if (value === "") return null;
  return pattern.test(value) ? Number(value) : "bad";
};

export function rowFigures(row: PriceSheetRowView, edit: RowEdit | undefined): RowFigures {
  const base = effectivePrices(row.entry, row.item);
  const cost = typed(edit?.cost, base.costPrice);
  const mrp = typed(edit?.mrp, base.mrp);
  const min = typed(edit?.min, base.minSellingPrice);
  const margin = typed(edit?.margin, null, SIGNED);
  const price = typed(edit?.price, base.sellingPrice);
  if (cost === "bad" || mrp === "bad" || min === "bad" || price === "bad" || margin === "bad") {
    return { price: base.sellingPrice, margin: 0, cost: base.costPrice, mrp: base.mrp, min: base.minSellingPrice, problem: "Enter a number, up to 2 decimals" };
  }
  const dayCost = cost ?? row.item.costPrice;
  const dayMrp = edit?.mrp === undefined ? mrp : (mrp ?? row.item.mrp);
  const dayMin = min;
  if (edit?.margin !== undefined && edit.price === undefined && margin !== null) {
    if (margin < MARGIN_LIMITS.min || margin >= MARGIN_LIMITS.below) {
      return { price: base.sellingPrice, margin, cost: dayCost, mrp: dayMrp, min: dayMin, problem: "Margin is from -100% to under 100%" };
    }
    if (dayCost === null) {
      return { price: base.sellingPrice, margin, cost: null, mrp: dayMrp, min: dayMin, problem: "No stock yet, so no cost: type the price or a cost" };
    }
    const fromMargin = priceFromMargin(dayCost, margin);
    return { price: fromMargin, margin, cost: dayCost, mrp: dayMrp, min: dayMin, problem: priceProblem({ sellingPrice: fromMargin, costPrice: dayCost, mrp: dayMrp, minSellingPrice: dayMin }) };
  }
  const dayPrice = price;
  return {
    price: dayPrice,
    margin: dayPrice === null ? null : marginOf(dayPrice, dayCost),
    cost: dayCost,
    mrp: dayMrp,
    min: dayMin,
    problem: priceProblem({ sellingPrice: dayPrice, costPrice: dayCost, mrp: dayMrp, minSellingPrice: dayMin }),
  };
}

/** The edit after one cell changes: a price drops a typed margin, a margin drops a typed price. */
export function changeCell(edit: RowEdit | undefined, field: EditField, text: string): RowEdit {
  const next: RowEdit = { ...edit, [field]: text };
  if (field === "price") delete next.margin;
  if (field === "margin") delete next.price;
  return next;
}

/**
 * The row as the bulk save takes it. A figure not typed keeps the entry's
 * own (so a day laid over a range keeps that range's MRP), else stays blank:
 * MRP and cost then follow the item, a minimum is none.
 */
export function rowInput(row: PriceSheetRowView, edit: RowEdit, figures: RowFigures): PriceRowInput {
  const own = (text: string | undefined, stored: number | null | undefined) =>
    text === undefined ? (stored ?? null) : text.trim() === "" ? null : Number(text.replace(/,/g, ""));
  return {
    itemId: row.itemId,
    // Only rows without a problem are saved, so the price is there.
    sellingPrice: figures.price!,
    costPrice: own(edit.cost, row.entry?.costPrice),
    mrp: own(edit.mrp, row.entry?.mrp),
    minSellingPrice: own(edit.min, row.entry?.minSellingPrice),
  };
}

export type BulkChange = { kind: "amount"; value: number } | { kind: "percent"; value: number } | { kind: "margin"; value: number };

/** One bulk change applied to a row's current figures, as a typed edit. */
export function applyBulk(edit: RowEdit | undefined, figures: RowFigures, change: BulkChange): RowEdit {
  if (change.kind === "margin") return changeCell(edit, "margin", String(change.value));
  // No price that day: nothing to raise or lower.
  if (figures.price === null) return edit ?? {};
  const price = change.kind === "amount" ? figures.price + change.value : figures.price * (1 + change.value / 100);
  return changeCell(edit, "price", (Math.round(price * 100) / 100).toFixed(2));
}
