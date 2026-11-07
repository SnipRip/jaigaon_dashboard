// One quotation or invoice line as the form works with it: the item, its
// HSN and GST, the unit the line is in (any of the item's units) and the
// same line in base units for stock and schemes, and the rate options
// re-stated per the line's unit. Shared by both sale forms. No React.
import { resolveItemDefaults, type ItemCatalog } from "@/features/items/item-rules";
import { inBaseUnits, unitChoices, unitFactor } from "@/features/items/line-units";
import { scaleRateOptions, schemeRateSource, type LineRateOptions } from "./line-rate-options";

/** A line as the form holds it: numbers as typed text, unit blank for the base. */
export interface SaleLineInput {
  itemId: string;
  unit: string;
  quantity: string;
  rate: string;
  discountPct: string;
}

export const EMPTY_SALE_LINE: SaleLineInput = { itemId: "", unit: "", quantity: "", rate: "", discountPct: "" };

export function saleLineRow(catalog: ItemCatalog, line: SaleLineInput | undefined, index: number, optionsOf: Map<string, LineRateOptions>) {
  const item = catalog.items.find((candidate) => candidate.id === line?.itemId);
  if (!item || !line) return undefined;
  const defaults = resolveItemDefaults(catalog, item);
  const baseUnit = defaults.unit.value ?? "";
  const choices = unitChoices(item, baseUnit);
  const choice = choices.find((candidate) => candidate.unit === line.unit) ?? choices[0];
  const quantity = Number(line.quantity) || 0;
  const rate = Number(line.rate) || 0;
  const discountPct = Number(line.discountPct) || 0;
  const baseOptions = optionsOf.get(item.id);
  // Rates are offered per base unit; the line sees them per its own unit.
  const options = baseOptions && scaleRateOptions(baseOptions, choice.factor);
  return {
    key: String(index),
    item,
    hsn: defaults.hsn.value ?? "",
    unit: choice.unit,
    baseUnit,
    factor: choice.factor,
    choices,
    /** What schemes and stock see. */
    base: inBaseUnits(quantity, rate, choice.factor),
    gstRatePct: defaults.gstRatePct.value ?? 0,
    quantity,
    rate,
    discountPct,
    gross: Math.round(quantity * rate * (1 - discountPct / 100) * 100) / 100,
    options,
    rateSource: schemeRateSource(rate, options),
  };
}

/** Base units in one of the line's unit (1 before an item is picked). */
export function saleLineFactor(catalog: ItemCatalog, line: Pick<SaleLineInput, "itemId" | "unit"> | undefined): number {
  const item = catalog.items.find((candidate) => candidate.id === line?.itemId);
  return item ? unitFactor(item, resolveItemDefaults(catalog, item).unit.value ?? "", line?.unit) : 1;
}
