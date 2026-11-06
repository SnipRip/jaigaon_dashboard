import { Button } from "@/components/ui/button";
import { GlassTable } from "@/components/ui/glass-table";
import { StockCell } from "@/features/items/stock-cell";
import { formatDate, formatPercent, formatRate } from "@/lib/format";
import type { RateEnquiryItemView } from "@/types/rate-enquiry";
import { itemMargin } from "./enquiry-rules";

interface ProductTableProps {
  items: RateEnquiryItemView[];
  /** Item ids already in the quotation draft. */
  addedIds: Set<string>;
  onToggle: (item: RateEnquiryItemView) => void;
  /** No live items at all (not just none matching). */
  empty: boolean;
}

/** What the rate is under the figure: where it came from, and the customer's last rates. */
function RateNote({ item }: { item: RateEnquiryItemView }) {
  const { options } = item;
  const notes = [
    options.source === "special" ? "Special rate" : options.source === "price-list" ? "Price list" : undefined,
    options.rate === null && options.previousSheetRate ? `Was ${formatRate(options.previousSheetRate.rate)} till ${formatDate(options.previousSheetRate.validTill)}` : undefined,
    options.lastSold ? `Last sold ${formatRate(options.lastSold.rate)}` : options.lastQuoted ? `Last quoted ${formatRate(options.lastQuoted.rate)}` : undefined,
  ].filter(Boolean);
  return notes.length ? <div className="text-xs font-medium text-muted">{notes.join(" · ")}</div> : null;
}

/** Search results: stock, MRP, cost, the customer's rate and margin per item. */
export function ProductTable({ items, addedIds, onToggle, empty }: ProductTableProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        {empty ? "No items yet. Add them on the Items page." : "No products match this search."}
      </p>
    );
  }

  return (
    <GlassTable className="min-w-[760px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">Product</th>
          <th scope="col">In stock</th>
          <th scope="col">MRP</th>
          <th scope="col">Cost</th>
          <th scope="col">Rate</th>
          <th scope="col">Margin</th>
          <th scope="col">
            <span className="sr-only">Add to quotation</span>
          </th>
        </tr>
      </thead>
      <tbody className="text-right font-semibold tabular-nums">
        {items.map((item) => {
          const isAdded = addedIds.has(item.itemId);
          const { options } = item;
          const margin = itemMargin(item);
          const detail = [item.sku, item.brandName, item.subCategoryName ?? item.categoryName, item.unit && `per ${item.unit}`].filter(Boolean).join(" · ");
          return (
            <tr key={item.itemId}>
              <td className="text-left">
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-muted">{detail}</div>
              </td>
              <td>
                <StockCell item={item} unit={item.unit ?? undefined} />
              </td>
              <td>{options.mrp !== null ? formatRate(options.mrp) : "—"}</td>
              <td>{options.marginCost !== null ? formatRate(options.marginCost) : <span className="whitespace-nowrap text-muted">No cost yet</span>}</td>
              <td>
                {options.rate !== null ? (
                  <div className="font-semibold text-brand">{formatRate(options.rate)}</div>
                ) : (
                  <div className="whitespace-nowrap text-muted">No rate today</div>
                )}
                <RateNote item={item} />
              </td>
              <td className={margin !== null && margin < 0 ? "text-danger-strong" : "text-success-strong"}>{margin !== null ? formatPercent(margin) : "—"}</td>
              <td>
                <Button
                  variant={isAdded ? "success" : "outline"}
                  aria-pressed={isAdded}
                  aria-label={`${isAdded ? "Remove" : "Add"} ${item.name}`}
                  onClick={() => onToggle(item)}
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
