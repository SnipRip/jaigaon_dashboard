"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity, formatRate } from "@/lib/format";
import { categoryPath, resolveItemDefaults, stockStatus, type ItemCatalog } from "./item-rules";
import { StockCell } from "./stock-cell";
import type { Item, ItemGroup } from "./types";

/** One line of the list: an item on its own, or a group with its variants. */
export type ItemListRow = { kind: "item"; item: Item } | { kind: "group"; group: ItemGroup; variants: Item[] };

interface ItemsTableProps {
  catalog: ItemCatalog;
  rows: ItemListRow[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}

const range = (values: number[]) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? formatRate(low) : `${formatRate(low)} – ${formatRate(high)}`;
};

// Zoho-style list: an item group shows as one row with a variant count and
// opens to list its variants, each of which is an item with its own stock.
export function ItemsTable({ catalog, rows, expandedGroups, onToggleGroup }: ItemsTableProps) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-muted">No items match this search and filter.</p>;
  }

  const itemRow = (item: Item, isVariant: boolean) => {
    const resolved = resolveItemDefaults(catalog, item);
    return (
      <tr key={item.id} className={clsx(isVariant && "bg-white/25")}>
        <td className="text-left">
          <div className={clsx(isVariant && "pl-11")}>
            <Link href={`/items/${item.id}`} className="font-bold hover:text-brand hover:underline">
              {isVariant ? Object.values(item.attributeValues ?? {}).join(" · ") : item.name}
            </Link>
            <div className="text-xs text-muted">
              {[item.sku, item.brand, isVariant ? undefined : categoryPath(catalog, item.categoryId, item.subCategoryId)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </td>
        <td className="text-left whitespace-nowrap">
          {resolved.hsn.value ?? "—"}
          <span className="text-muted"> · {resolved.gstRatePct.value ?? "—"}%</span>
        </td>
        <td>
          <StockCell item={item} unit={resolved.unit.value} />
        </td>
        <td>{formatRate(item.costPrice)}</td>
        <td className="font-bold text-brand">
          {formatRate(item.sellingPrice)}
          <span className="text-xs font-semibold text-muted"> / {resolved.unit.value}</span>
        </td>
      </tr>
    );
  };

  return (
    <GlassTable className="min-w-[720px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">Item</th>
          <th scope="col" className="text-left whitespace-nowrap">HSN · GST</th>
          <th scope="col">In stock</th>
          <th scope="col">Cost</th>
          <th scope="col">Selling price</th>
        </tr>
      </thead>
      <tbody className="text-right font-semibold tabular-nums">
        {rows.map((row) => {
          if (row.kind === "item") return itemRow(row.item, false);

          const { group, variants } = row;
          const isOpen = expandedGroups.has(group.id);
          const first = variants[0];
          const resolved = resolveItemDefaults(catalog, first);
          const lowCount = variants.filter((variant) => stockStatus(variant) !== "ok").length;
          const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
          return (
            <Fragment key={group.id}>
              <tr>
                <td className="text-left">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} variants of ${group.name}`}
                      onClick={() => onToggleGroup(group.id)}
                      className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white/60 hover:text-ink"
                    >
                      <ChevronRight aria-hidden="true" className={clsx("size-4 transition-transform", isOpen && "rotate-90")} />
                    </button>
                    <div className="min-w-0">
                      <Link href={`/items/groups/${group.id}`} className="font-bold hover:text-brand hover:underline">
                        {group.name}
                      </Link>
                      <div className="text-xs text-muted">
                        {[
                          `Item group · ${variants.length} ${variants.length === 1 ? "variant" : "variants"}`,
                          group.brand,
                          categoryPath(catalog, group.categoryId, group.subCategoryId),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-left whitespace-nowrap">
                  {resolved.hsn.value ?? "—"}
                  <span className="text-muted"> · {resolved.gstRatePct.value ?? "—"}%</span>
                </td>
                <td>
                  {lowCount > 0 ? (
                    <StatusChip tone="warning">{lowCount} low or out</StatusChip>
                  ) : (
                    `${formatQuantity(totalStock)} ${resolved.unit.value ?? ""}`
                  )}
                </td>
                <td>{range(variants.map((variant) => variant.costPrice))}</td>
                <td className="font-bold text-brand">{range(variants.map((variant) => variant.sellingPrice))}</td>
              </tr>
              {isOpen && variants.map((variant) => itemRow(variant, true))}
            </Fragment>
          );
        })}
      </tbody>
    </GlassTable>
  );
}
