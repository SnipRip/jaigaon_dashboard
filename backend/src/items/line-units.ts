// A document line may be entered in any of the item's units (Tally's
// alternate units, but as many as the item has): 10 bags at ₹350 a bag. Stock,
// FIFO cost, schemes and rate history all work in the base unit, so the line
// is turned into base quantity and base rate here, and what was typed is kept
// beside it for printing. The base rate is worked out so that base quantity ×
// base rate gives exactly the typed quantity × typed rate.
import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

/** One unit an item is traded in: base units in one of it. */
export interface UnitFactor {
  unit: string;
  factor: number;
}

export interface ItemUnits {
  name: string;
  /** Base unit symbol. */
  unit: string;
  /** Alternate units only (not the base). */
  alternates: UnitFactor[];
  /** Null = the base unit. */
  reportingUnit: string | null;
}

export interface EnteredLine {
  /** Symbol; blank or the base unit = the base unit. */
  unit?: string | null;
  quantity: number;
  rate: number;
}

export interface LineInUnits {
  /** Base units, to 3 decimals. */
  quantity: number;
  /** Per base unit, unrounded so quantity × rate = what was typed. */
  rate: number;
  /** Null = the base unit. */
  lineUnit: string | null;
  lineQuantity: number;
  lineRate: number;
  unitFactor: number;
}

const qty3 = (value: number) => Math.round(value * 1000) / 1000;

/** Base units in one of `unit` for this item; null when the item is not traded in it. */
export function factorOf(item: ItemUnits, unit: string | null | undefined): number | null {
  if (!unit || unit === item.unit) return 1;
  return item.alternates.find((alternate) => alternate.unit === unit)?.factor ?? null;
}

export function toBaseLine(item: ItemUnits, entered: EnteredLine): LineInUnits {
  const factor = factorOf(item, entered.unit);
  if (factor === null) throw new BadRequestException(`${item.name} is not traded in ${entered.unit}: add it under the item's units first`);
  const lineUnit = !entered.unit || entered.unit === item.unit ? null : entered.unit;
  const quantity = qty3(entered.quantity * factor);
  if (entered.quantity > 0 && quantity <= 0) throw new BadRequestException(`The quantity of ${item.name} is too small to count in ${item.unit}`);
  const rate = factor === 1 ? entered.rate : quantity > 0 ? (entered.quantity * entered.rate) / quantity : entered.rate / factor;
  return { quantity, rate, lineUnit, lineQuantity: entered.quantity, lineRate: entered.rate, unitFactor: factor };
}

/** The columns a line stores for what was entered. */
export function enteredColumns(line: LineInUnits) {
  return {
    lineUnit: line.lineUnit,
    lineQuantity: line.lineQuantity,
    lineRate: line.lineRate,
    unitFactor: line.unitFactor,
    rate: Math.round(line.rate * 10000) / 10000,
  };
}

interface StoredEntered {
  lineUnit: string | null;
  lineQuantity: Prisma.Decimal;
  lineRate: Prisma.Decimal;
  unitFactor: Prisma.Decimal;
}

/** What a stored line was entered as, for views and prints. */
export function enteredView(line: StoredEntered, baseUnit: string) {
  return {
    unit: line.lineUnit ?? baseUnit,
    quantity: line.lineQuantity.toNumber(),
    rate: line.lineRate.toNumber(),
    /** Base units in one `unit`. */
    factor: line.unitFactor.toNumber(),
  };
}

/** A base quantity in the item's reporting unit, for GSTR-1. */
export function inReportingUnit(item: ItemUnits, baseQuantity: number): { reportUnit: string; reportQuantity: number } {
  const factor = factorOf(item, item.reportingUnit) ?? 1;
  return { reportUnit: factor === 1 ? item.unit : item.reportingUnit!, reportQuantity: qty3(baseQuantity / factor) };
}
