// Shapes shared by the rate-enquiry files. They anticipate the product,
// customer and quotation tables the backend will own.
export interface Product {
  sku: string;
  name: string;
  category: string;
  /** Brand, make or pack description shown under the name. */
  detail: string;
  unit: string;
  stock: number;
  /** At or below this quantity the product is flagged as low stock. */
  lowStockAt: number;
  mrp: number;
  cost: number;
  standardDiscountPct: number;
  minSellingPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  /** Negotiated discount per SKU. A SKU not listed gets the standard discount. */
  negotiatedDiscountPct: Record<string, number>;
  lastQuoted: string | null;
  outstanding: number;
}

/** A product with the rate that applies to one customer. */
export interface PricedProduct extends Product {
  discountPct: number;
  netRate: number;
  marginPct: number;
}

export interface QuotationLine {
  product: PricedProduct;
  quantity: number;
}

export interface QuotationTotals {
  value: number;
  profit: number;
  marginPct: number;
}
