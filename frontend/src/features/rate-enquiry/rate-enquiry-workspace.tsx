"use client";

import { useMemo, useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { SearchField } from "@/components/ui/search-field";
import { CustomerBar } from "./customer-bar";
import { matchesSearch, priceProduct } from "./pricing";
import { ProductTable } from "./product-table";
import { QuotationDraft } from "./quotation-draft";
import type { Customer, PricedProduct, Product, QuotationLine } from "./types";

const ALL_CATEGORIES = "All categories";

interface RateEnquiryWorkspaceProps {
  products: Product[];
  categories: string[];
  customers: Customer[];
}

// Owns the state of the rate-enquiry screen: chosen customer, search,
// category filter and the quantities in the draft. Rates are always derived
// from the current customer, so switching customer re-prices the draft.
export function RateEnquiryWorkspace({ products, categories, customers }: RateEnquiryWorkspaceProps) {
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const customer = customers.find((candidate) => candidate.id === customerId) ?? customers[0];

  const pricedProducts = useMemo(() => products.map((product) => priceProduct(product, customer)), [products, customer]);

  const visibleProducts = pricedProducts.filter(
    (product) => (category === ALL_CATEGORIES || product.category === category) && matchesSearch(product, query),
  );

  const lines: QuotationLine[] = pricedProducts
    .filter((product) => product.sku in quantities)
    .map((product) => ({ product, quantity: quantities[product.sku] }));

  const toggleProduct = (product: PricedProduct) =>
    setQuantities(({ [product.sku]: existing, ...rest }) => (existing === undefined ? { ...rest, [product.sku]: 1 } : rest));

  const changeQuantity = (sku: string, quantity: number) => setQuantities((current) => ({ ...current, [sku]: quantity }));

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[2fr_1fr]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <CustomerBar customers={customers} selected={customer} onSelect={setCustomerId} />

        <GlassCard className="flex flex-col gap-3.5">
          <SearchField
            id="product-search"
            label="Search products"
            value={query}
            onChange={setQuery}
            placeholder="Search by name, SKU, category, brand or size"
            trailing={`${visibleProducts.length} of ${products.length}`}
            prominent
          />

          <FilterGroup label="Category">
            {[ALL_CATEGORIES, ...categories].map((name) => (
              <FilterChip key={name} selected={category === name} onClick={() => setCategory(name)}>
                {name}
              </FilterChip>
            ))}
          </FilterGroup>

          <ProductTable products={visibleProducts} addedSkus={new Set(Object.keys(quantities))} onToggle={toggleProduct} />
          <p className="text-xs font-semibold text-muted">
            Net rate = MRP less the discount that applies to this customer. It never goes below the minimum selling
            price.
          </p>
        </GlassCard>
      </div>

      <QuotationDraft customerId={customer.id} customerName={customer.name} lines={lines} onQuantityChange={changeQuantity} />
    </div>
  );
}
