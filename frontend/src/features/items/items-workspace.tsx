"use client";

import { FolderTree, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { ImportDialog } from "@/components/ui/import-dialog";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SearchField } from "@/components/ui/search-field";
import { formatQuantity } from "@/lib/format";
import { CategoryTree, type CategorySelection } from "./category-tree";
import { countItems, matchesItemSearch, stockStatus, type ItemCatalog } from "./item-rules";
import { ItemsTable, type ItemListRow } from "./items-table";
import type { Item, StockFilter } from "./types";

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "All stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

function passesStockFilter(item: Item, filter: StockFilter) {
  const status = stockStatus(item);
  if (filter === "low") return status === "low";
  if (filter === "out") return status === "out";
  return true;
}

// Owns the item list: category filter, search, stock filter and which groups
// are open. Items of a group are gathered under one group row, in the order
// the group first appears.
export function ItemsWorkspace({ catalog }: { catalog: ItemCatalog }) {
  const [selection, setSelection] = useState<CategorySelection>({});
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const counts = useMemo(() => countItems(catalog.items), [catalog.items]);

  const visibleItems = catalog.items.filter(
    (item) =>
      (!selection.categoryId || item.categoryId === selection.categoryId) &&
      (!selection.subCategoryId || item.subCategoryId === selection.subCategoryId) &&
      passesStockFilter(item, stockFilter) &&
      matchesItemSearch(catalog, item, query),
  );

  const rows: ItemListRow[] = [];
  const groupRows = new Map<string, Extract<ItemListRow, { kind: "group" }>>();
  for (const item of visibleItems) {
    const group = item.groupId ? catalog.groups.find((candidate) => candidate.id === item.groupId) : undefined;
    if (!group) {
      rows.push({ kind: "item", item });
      continue;
    }
    const existing = groupRows.get(group.id);
    if (existing) existing.variants.push(item);
    else {
      const row = { kind: "group" as const, group, variants: [item] };
      groupRows.set(group.id, row);
      rows.push(row);
    }
  }

  // While searching or filtering stock, open every group so the matching
  // variants are in view.
  const filtering = query.trim() !== "" || stockFilter !== "all";
  const expandedGroups = filtering ? new Set(groupRows.keys()) : expanded;

  const toggleGroup = (groupId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  const lowCount = catalog.items.filter((item) => stockStatus(item) === "low").length;
  const outCount = catalog.items.filter((item) => stockStatus(item) === "out").length;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[264px_minmax(0,1fr)]">
      <GlassCard className="flex flex-col gap-3 p-4 sm:p-4">
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <CardTitle>Categories</CardTitle>
          <Link href="/items/categories" className="text-[13px] font-bold text-brand hover:underline">
            Manage
          </Link>
        </div>
        <CategoryTree
          categories={catalog.categories}
          counts={counts}
          total={catalog.items.length}
          selected={selection}
          onSelect={setSelection}
        />
      </GlassCard>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Items" value={catalog.items.length} />
          <Stat label="Item groups" value={catalog.groups.length} />
          <Stat label="Low stock" value={lowCount} tone="warning" onClick={() => setStockFilter("low")} />
          <Stat label="Out of stock" value={outCount} tone="danger" onClick={() => setStockFilter("out")} />
        </div>

        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/items/new" className={buttonClasses("primary")}>
              <Plus aria-hidden="true" className="size-[18px]" />
              New item
            </Link>
            <Link href="/items/groups/new" className={buttonClasses("outline")}>
              <Layers aria-hidden="true" className="size-[18px]" />
              New item group
            </Link>
            <Link href="/items/categories" className={buttonClasses("neutral")}>
              <FolderTree aria-hidden="true" className="size-[18px]" />
              Categories
            </Link>
            <div className="ml-auto">
              <ImportDialog what="items" columns={["Name", "SKU", "Category", "Sub-category", "Brand", "HSN", "Unit", "MRP", "Selling price", "Cost price", "Opening stock", "Reorder level"]} />
            </div>
          </div>

          <SearchField
            id="item-search"
            label="Search items"
            value={query}
            onChange={setQuery}
            placeholder="Search by name, SKU, brand, size, HSN or category"
            trailing={`${visibleItems.length} of ${catalog.items.length}`}
            prominent
          />

          <div className="flex flex-wrap gap-2">
            {STOCK_FILTERS.map((filter) => (
              <FilterChip key={filter.value} selected={stockFilter === filter.value} onClick={() => setStockFilter(filter.value)}>
                {filter.label}
              </FilterChip>
            ))}
          </div>

          <ItemsTable catalog={catalog} rows={rows} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} />
          <p className="text-xs font-semibold text-muted">
            HSN, GST rate and unit are inherited from the category, sub-category or item group unless the item sets its
            own.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  tone?: "warning" | "danger";
  onClick?: () => void;
}

function Stat({ label, value, tone, onClick }: StatProps) {
  const figure = (
    <>
      <span className="text-xs font-bold text-muted">{label}</span>
      <span
        className={
          tone === "danger" && value > 0
            ? "text-2xl font-extrabold text-danger-strong tabular-nums"
            : tone === "warning" && value > 0
              ? "text-2xl font-extrabold text-warning-strong tabular-nums"
              : "text-2xl font-extrabold tabular-nums"
        }
      >
        {formatQuantity(value)}
      </span>
    </>
  );
  return (
    <GlassCard className="p-0 sm:p-0">
      {onClick ? (
        <button type="button" onClick={onClick} className="glass-press flex w-full flex-col items-start gap-1 rounded-[26px] p-4 text-left">
          {figure}
          <span className="text-[11px] font-bold text-brand">Show these</span>
        </button>
      ) : (
        <div className="flex flex-col gap-1 p-4">{figure}</div>
      )}
    </GlassCard>
  );
}
