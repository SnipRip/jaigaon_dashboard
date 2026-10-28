// SAMPLE DATA for the rate-enquiry screen. Product names and sizes come from
// the company brochure; every price, stock figure and customer is invented.
// Replace with backend calls when the product and customer modules are built.
import type { Customer, Product } from "./types";

export const products: Product[] = [
  { sku: "IS-TMT-12", name: "TMT Bar FE 600, 12mm", category: "Iron & steel", detail: "Hind TMT", unit: "kg", stock: 4850, lowStockAt: 5000, mrp: 64, cost: 52.4, standardDiscountPct: 5, minSellingPrice: 55 },
  { sku: "IS-TMT-16", name: "TMT Bar FE 600, 16mm", category: "Iron & steel", detail: "Hind TMT", unit: "kg", stock: 7200, lowStockAt: 5000, mrp: 64, cost: 52.1, standardDiscountPct: 5, minSellingPrice: 55 },
  { sku: "IS-ANG-5056", name: "MS Angle 50×50×6", category: "Iron & steel", detail: "ISI", unit: "kg", stock: 2140, lowStockAt: 1000, mrp: 71, cost: 58.9, standardDiscountPct: 4, minSellingPrice: 62 },
  { sku: "BR-AAC-200", name: "AAC Block 600×200×200", category: "Bricks & AAC blocks", detail: "19.2 kg per block", unit: "pcs", stock: 1860, lowStockAt: 800, mrp: 98, cost: 74, standardDiscountPct: 6, minSellingPrice: 80 },
  { sku: "BR-AAC-125", name: "AAC Block 600×200×125", category: "Bricks & AAC blocks", detail: "12.0 kg per block", unit: "pcs", stock: 420, lowStockAt: 800, mrp: 62, cost: 47, standardDiscountPct: 6, minSellingPrice: 51 },
  { sku: "IS-BW-22", name: "Binding Wire 22 gauge", category: "Iron & steel", detail: "25 kg bundle", unit: "bundles", stock: 12, lowStockAt: 20, mrp: 2150, cost: 1780, standardDiscountPct: 3, minSellingPrice: 1900 },
  { sku: "IS-WN-25", name: "Wire Nail, assorted sizes", category: "Iron & steel", detail: "25 kg bag", unit: "bags", stock: 96, lowStockAt: 30, mrp: 2400, cost: 1935, standardDiscountPct: 4, minSellingPrice: 2080 },
  { sku: "HW-PLY-18", name: "Plywood 18mm, 8×4 ft", category: "Hardware & plywood", detail: "Per sheet", unit: "sheets", stock: 240, lowStockAt: 60, mrp: 2650, cost: 2090, standardDiscountPct: 5, minSellingPrice: 2250 },
];

export const categories = [...new Set(products.map((product) => product.category))];

export const customers: Customer[] = [
  {
    id: "tashi-construction",
    name: "Tashi Construction, Thimphu",
    negotiatedDiscountPct: { "IS-TMT-12": 9, "IS-TMT-16": 9, "IS-ANG-5056": 8, "BR-AAC-200": 10, "IS-BW-22": 6, "IS-WN-25": 8 },
    lastQuoted: "02 Oct · QTN-2610-009",
    outstanding: 112000,
  },
  {
    id: "druk-builders",
    name: "Druk Builders, Phuentsholing",
    negotiatedDiscountPct: { "IS-TMT-12": 7, "IS-TMT-16": 7, "BR-AAC-200": 8 },
    lastQuoted: "08 Oct · QTN-2610-031",
    outstanding: 140000,
  },
  { id: "walk-in", name: "Walk-in customer (standard rates)", negotiatedDiscountPct: {}, lastQuoted: null, outstanding: 0 },
];
