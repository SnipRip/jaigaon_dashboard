// SAMPLE DATA: units for the sample reports only (the units master is real
// since 1 Nov 2026). Goes when the reports move to real data.
import type { Unit } from "./types";

export const units: Unit[] = [
  { id: "kg", symbol: "kg", name: "Kilogram", kind: "weight", decimals: 3, uqc: "KGS" },
  { id: "ton", symbol: "ton", name: "Metric ton", kind: "weight", decimals: 3, uqc: "MTS" },
  { id: "pcs", symbol: "pcs", name: "Pieces", kind: "count", decimals: 0, uqc: "PCS" },
  { id: "bag", symbol: "bag", name: "Bag", kind: "count", decimals: 0, uqc: "BAG" },
  { id: "bundle", symbol: "bundle", name: "Bundle", kind: "count", decimals: 0, uqc: "BDL" },
  { id: "sheet", symbol: "sheet", name: "Sheet", kind: "count", decimals: 0, uqc: "PCS" },
  { id: "box", symbol: "box", name: "Box", kind: "count", decimals: 0, uqc: "BOX" },
  { id: "thousand", symbol: "thousand", name: "Thousand (bricks)", kind: "count", decimals: 2, uqc: "THD" },
  { id: "cbm", symbol: "CBM", name: "Cubic metre", kind: "volume", decimals: 3, uqc: "CBM" },
  { id: "cft", symbol: "cft", name: "Cubic foot", kind: "volume", decimals: 2, uqc: "CFT" },
  { id: "sqft", symbol: "sq ft", name: "Square foot", kind: "area", decimals: 2, uqc: "SQF" },
  { id: "m", symbol: "m", name: "Metre", kind: "length", decimals: 2, uqc: "MTR" },
  { id: "l", symbol: "L", name: "Litre", kind: "volume", decimals: 2, uqc: "LTR" },
];
