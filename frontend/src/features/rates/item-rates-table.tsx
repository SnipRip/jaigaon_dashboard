"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import type { Item } from "@/features/items/types";
import { fromFormValues, type FieldSpec } from "@/features/masters/record-fields";
import { RecordForm } from "@/features/masters/record-form";
import { ApiError } from "@/lib/api-client";
import { formatPercent, formatRate } from "@/lib/format";
import { marginPct } from "./rate-rules";

const FIELDS: FieldSpec[] = [
  { key: "mrp", label: "MRP (₹)", kind: "number" },
  { key: "costPrice", label: "Cost price (₹)", kind: "number", required: true, hint: "Last purchase rate until landed FIFO cost is kept" },
  { key: "sellingPrice", label: "Selling price (₹)", kind: "number", required: true },
  { key: "minSellingPrice", label: "Minimum selling price (₹)", kind: "number", hint: "No quotation or invoice may go below it" },
];

type Prices = Pick<Item, "mrp" | "costPrice" | "sellingPrice" | "minSellingPrice">;

interface ItemRatesTableProps {
  /** With `onSave`, pass the reloaded list again after a save; it replaces the shown one. */
  initialItems: Item[];
  units: Record<string, string>;
  /** Saves through the backend; without it, changes stay on the page. */
  onSave?: (item: Item, prices: Prices) => Promise<void>;
}

// MRP, cost, selling and minimum price of every item in one table (SOW 3),
// with the margin each gives. Editing here changes the item's own prices.
export function ItemRatesTable({ initialItems, units, onSave }: ItemRatesTableProps) {
  const [items, setItems] = useState(initialItems);
  const [loaded, setLoaded] = useState(initialItems);
  if (loaded !== initialItems) {
    setLoaded(initialItems);
    setItems(initialItems);
  }
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => !needle || `${item.name} ${item.sku} ${item.brand ?? ""}`.toLowerCase().includes(needle));

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <SearchField id="item-rate-search" label="Search items" value={query} onChange={setQuery} placeholder="Search by item, SKU or brand" trailing={`${visible.length} of ${items.length}`} prominent />
      <GlassTable className="min-w-[860px]">
        <thead>
          <tr className="text-right">
            <th scope="col" className="text-left">Item</th>
            <th scope="col">MRP</th>
            <th scope="col">Cost</th>
            <th scope="col">Selling</th>
            <th scope="col">Minimum</th>
            <th scope="col">Margin</th>
            <th scope="col">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-right font-semibold tabular-nums">
          {visible.map((item) => {
            const margin = marginPct(item.sellingPrice, item.costPrice);
            return (
              <tr key={item.id}>
                <td className="text-left">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-muted">
                    {item.sku} · per {units[item.id]}
                  </div>
                </td>
                <td>{item.mrp ? formatRate(item.mrp) : "–"}</td>
                <td>{formatRate(item.costPrice)}</td>
                <td className="font-semibold">{formatRate(item.sellingPrice)}</td>
                <td>{item.minSellingPrice ? formatRate(item.minSellingPrice) : "–"}</td>
                <td className={margin < 8 ? STATUS_TEXT.danger : margin < 12 ? STATUS_TEXT.warning : STATUS_TEXT.success}>{formatPercent(margin)}</td>
                <td>
                  <button
                    type="button"
                    aria-label={`Edit prices of ${item.name}`}
                    onClick={() => setEditing(item)}
                    className="glass-control glass-press inline-flex size-9 items-center justify-center text-ink-soft hover:bg-white/80"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </GlassTable>
      {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">{items.length ? "No items match." : "No items yet. Add them on the Items screen."}</p>}
      {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
      <p className="text-xs font-semibold text-muted">Margin under 8% shows red, under 12% amber.</p>

      <GlassModal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title={editing ? `Prices of ${editing.name}` : "Prices"} description="Customers get these unless a price level, special rate or slab applies.">
        {editing && (
          <RecordForm
            key={editing.id}
            fields={FIELDS}
            initial={editing as unknown as Record<string, unknown>}
            submitLabel="Save prices"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              const changes = fromFormValues(FIELDS, values) as Partial<Item>;
              const prices: Prices = { mrp: changes.mrp, costPrice: changes.costPrice ?? 0, sellingPrice: changes.sellingPrice ?? 0, minSellingPrice: changes.minSellingPrice };
              if ((prices.minSellingPrice ?? 0) > prices.sellingPrice || (prices.mrp !== undefined && prices.sellingPrice > prices.mrp)) {
                setNotice({ tone: "error", text: "Keep minimum ≤ selling ≤ MRP. Nothing was changed." });
              } else if (onSave) {
                try {
                  await onSave(editing, prices);
                  setItems((current) => current.map((item) => (item.id === editing.id ? { ...item, ...prices } : item)));
                  setNotice({ tone: "success", text: `Prices of ${editing.name} saved.` });
                } catch (error) {
                  setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
                }
              } else {
                setItems((current) => current.map((item) => (item.id === editing.id ? { ...item, ...prices } : item)));
                setNotice({ tone: "success", text: `${editing.name} updated on this page. Saving switches on when items are connected to the database.` });
              }
              setEditing(null);
            }}
          />
        )}
      </GlassModal>
    </GlassCard>
  );
}
