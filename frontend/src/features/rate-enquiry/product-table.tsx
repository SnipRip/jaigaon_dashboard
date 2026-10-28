import { Button } from "@/components/ui/button";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatPercent, formatQuantity, formatRate } from "@/lib/format";
import type { PricedProduct } from "./types";

interface ProductTableProps {
  products: PricedProduct[];
  /** SKUs already in the quotation draft. */
  addedSkus: Set<string>;
  onToggle: (product: PricedProduct) => void;
}

/** Search results: stock, MRP, cost, discount, net rate and margin per product. */
export function ProductTable({ products, addedSkus, onToggle }: ProductTableProps) {
  if (products.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted">No products match this search.</p>;
  }

  return (
    <GlassTable className="min-w-[760px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">Product</th>
          <th scope="col">In stock</th>
          <th scope="col">MRP</th>
          <th scope="col">Cost</th>
          <th scope="col">Discount</th>
          <th scope="col">Net rate</th>
          <th scope="col">Margin</th>
          <th scope="col">
            <span className="sr-only">Add to quotation</span>
          </th>
        </tr>
      </thead>
      <tbody className="text-right font-semibold tabular-nums">
        {products.map((product) => {
          const isAdded = addedSkus.has(product.sku);
          const stockLabel = `${formatQuantity(product.stock)} ${product.unit}`;
          return (
            <tr key={product.sku}>
              <td className="text-left">
                <div className="font-semibold">{product.name}</div>
                <div className="text-xs text-muted">
                  {product.sku} · {product.detail} · per {product.unit}
                </div>
              </td>
              <td>{product.stock <= product.lowStockAt ? <StatusChip tone="warning">Low · {stockLabel}</StatusChip> : stockLabel}</td>
              <td>{formatRate(product.mrp)}</td>
              <td>{formatRate(product.cost)}</td>
              <td>{product.discountPct}%</td>
              <td className="font-semibold text-brand">{formatRate(product.netRate)}</td>
              <td className="text-success-strong">{formatPercent(product.marginPct)}</td>
              <td>
                <Button
                  variant={isAdded ? "success" : "outline"}
                  aria-pressed={isAdded}
                  aria-label={`${isAdded ? "Remove" : "Add"} ${product.name}`}
                  onClick={() => onToggle(product)}
                  className="min-w-[84px]"
                >
                  {isAdded ? "Added" : "Add"}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </GlassTable>
  );
}
