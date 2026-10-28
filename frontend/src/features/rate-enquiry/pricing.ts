// Rate rules from SOW section 4 (Smart Rate Management). Pure functions, so
// they can move to the backend unchanged when quotations are persisted.
import type { Customer, PricedProduct, Product, QuotationLine, QuotationTotals } from "./types";

const roundToPaise = (amount: number) => Math.round(amount * 100) / 100;

/** The customer's negotiated discount for this product, else the standard one. */
export function applicableDiscountPct(product: Product, customer: Customer): number {
  return customer.negotiatedDiscountPct[product.sku] ?? product.standardDiscountPct;
}

/** MRP less discount, never below the minimum selling price. */
export function netRate(product: Product, discountPct: number): number {
  const discounted = product.mrp * (1 - discountPct / 100);
  return roundToPaise(Math.max(discounted, product.minSellingPrice));
}

/** Profit as a share of the selling rate. */
export function marginPct(rate: number, cost: number): number {
  return rate === 0 ? 0 : ((rate - cost) / rate) * 100;
}

export function priceProduct(product: Product, customer: Customer): PricedProduct {
  const discountPct = applicableDiscountPct(product, customer);
  const rate = netRate(product, discountPct);
  return { ...product, discountPct, netRate: rate, marginPct: marginPct(rate, product.cost) };
}

export const lineValue = (line: QuotationLine) => roundToPaise(line.quantity * line.product.netRate);

export function quotationTotals(lines: QuotationLine[]): QuotationTotals {
  const value = lines.reduce((sum, line) => sum + lineValue(line), 0);
  const cost = lines.reduce((sum, line) => sum + line.quantity * line.product.cost, 0);
  const profit = roundToPaise(value - cost);
  return { value: roundToPaise(value), profit, marginPct: marginPct(value, cost) };
}

/** Matches every search word against name, SKU, category and detail. */
export function matchesSearch(product: Product, query: string): boolean {
  const haystack = `${product.name} ${product.sku} ${product.category} ${product.detail}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
