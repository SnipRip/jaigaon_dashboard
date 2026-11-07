// The units a document line can be entered in: the item's base unit and each
// of its alternate units (Tally allows one; these items any number). Stock,
// cost, rate sheets and schemes stay per base unit, so a line in bags is
// turned into kilograms for those, the same way the backend does it
// (backend items/line-units.ts). No React.
import type { InvoiceLine } from "@/features/invoices/types";
import type { EnteredLineView } from "@/types/entered-line";
import { resolveItemDefaults, type ItemCatalog } from "./item-rules";
import type { Item } from "./types";

export interface UnitChoice {
  unit: string;
  /** Base units in one of this unit. */
  factor: number;
}

const money = (value: number) => Math.round(value * 100) / 100;
const qty3 = (value: number) => Math.round(value * 1000) / 1000;

/** The base unit first, then the alternates. */
export function unitChoices(item: Pick<Item, "alternateUnits">, baseUnit: string): UnitChoice[] {
  return [
    { unit: baseUnit, factor: 1 },
    ...item.alternateUnits.filter((row) => row.unit && row.unit !== baseUnit).map((row) => ({ unit: row.unit, factor: row.baseQuantity })),
  ];
}

/** Base units in one `unit`; 1 for the base unit, blank, or a unit the item no longer has. */
export function unitFactor(item: Pick<Item, "alternateUnits">, baseUnit: string, unit: string | undefined): number {
  if (!unit || unit === baseUnit) return 1;
  return item.alternateUnits.find((row) => row.unit === unit)?.baseQuantity ?? 1;
}

/** A per-base-unit rate as a rate per line unit. */
export const ratePerUnit = (baseRate: number, factor: number) => money(baseRate * factor);

/** A rate typed for one unit, re-stated for another (unit changed on the line). */
export const restateRate = (rate: number, fromFactor: number, toFactor: number) => money((rate / fromFactor) * toFactor);

/** What schemes and stock see: base quantity, and the base rate that keeps the value. */
export function inBaseUnits(quantity: number, rate: number, factor: number) {
  const baseQuantity = qty3(quantity * factor);
  return { quantity: baseQuantity, rate: baseQuantity ? (quantity * rate) / baseQuantity : rate / factor };
}

/**
 * A stored line (base `unit`, `quantity`, `rate` plus `entered`) as the
 * screens and prints show it: in the unit it was entered in.
 */
export function enteredLine(line: { unit: string; entered: EnteredLineView }) {
  return {
    unit: line.entered.unit,
    quantity: line.entered.quantity,
    rate: line.entered.rate,
    baseUnit: line.unit,
    unitFactor: line.entered.factor,
  };
}

/**
 * A typed order or bill line as a document line in its unit, with the
 * item's HSN and GST, its base unit and the units it can take. Undefined
 * before an item is picked.
 */
export function typedLine(
  catalog: ItemCatalog,
  line: { itemId: string; unit: string; quantity: string; rate: string; discountPct: string } | undefined,
): (InvoiceLine & { choices: UnitChoice[] }) | undefined {
  const item = catalog.items.find((candidate) => candidate.id === line?.itemId);
  if (!item || !line) return undefined;
  const defaults = resolveItemDefaults(catalog, item);
  const baseUnit = defaults.unit.value ?? "";
  const choices = unitChoices(item, baseUnit);
  const choice = choices.find((candidate) => candidate.unit === line.unit) ?? choices[0];
  return {
    itemId: item.id,
    description: item.name,
    hsn: defaults.hsn.value ?? "",
    unit: choice.unit,
    baseUnit,
    unitFactor: choice.factor,
    choices,
    gstRatePct: defaults.gstRatePct.value ?? 0,
    quantity: Number(line.quantity) || 0,
    rate: Number(line.rate) || 0,
    discountPct: Number(line.discountPct) || 0,
  };
}

/** "1 bag = 50 kg" for the line, or nothing for the base unit. */
export function conversionText(unit: string, factor: number, baseUnit: string): string | undefined {
  if (factor === 1 || unit === baseUnit) return undefined;
  return `1 ${unit} = ${Number(factor.toFixed(4))} ${baseUnit}`;
}
