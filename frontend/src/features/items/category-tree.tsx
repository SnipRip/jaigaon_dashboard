"use client";

import clsx from "clsx";
import { ChevronRight, Layers } from "lucide-react";
import { useState } from "react";
import { formatQuantity } from "@/lib/format";
import type { Category } from "./types";

export interface CategorySelection {
  categoryId?: string;
  subCategoryId?: string;
}

interface CategoryTreeProps {
  categories: Category[];
  counts: Map<string, number>;
  total: number;
  selected: CategorySelection;
  onSelect: (selection: CategorySelection) => void;
}

const rowClasses = (active: boolean) =>
  clsx(
    "glass-press flex min-h-11 w-full items-center gap-2 rounded-full px-3.5 text-left text-[13px] font-bold",
    active ? "glass-selected" : "text-ink-soft hover:bg-white/60",
  );

// The category → sub-category filter beside the item list. A category opens
// to show its sub-categories when it is picked or its arrow is pressed.
export function CategoryTree({ categories, counts, total, selected, onSelect }: CategoryTreeProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(selected.categoryId ? [selected.categoryId] : []));

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickCategory = (id: string) => {
    onSelect({ categoryId: id });
    setOpen((current) => new Set(current).add(id));
  };

  return (
    <nav aria-label="Filter by category" className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={!selected.categoryId}
        onClick={() => onSelect({})}
        className={rowClasses(!selected.categoryId)}
      >
        <Layers aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1">All items</span>
        <span className="text-xs text-muted tabular-nums">{formatQuantity(total)}</span>
      </button>

      {categories.map((category) => {
        const isOpen = open.has(category.id);
        const isCategoryActive = selected.categoryId === category.id && !selected.subCategoryId;
        return (
          <div key={category.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`${isOpen ? "Hide" : "Show"} sub-categories of ${category.name}`}
                aria-expanded={isOpen}
                disabled={category.subCategories.length === 0}
                onClick={() => toggle(category.id)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white/60 hover:text-ink disabled:invisible"
              >
                <ChevronRight aria-hidden="true" className={clsx("size-4 transition-transform", isOpen && "rotate-90")} />
              </button>
              <button
                type="button"
                aria-pressed={isCategoryActive}
                onClick={() => pickCategory(category.id)}
                className={rowClasses(isCategoryActive)}
              >
                <span className="flex-1">{category.name}</span>
                <span className="text-xs text-muted tabular-nums">{formatQuantity(counts.get(category.id) ?? 0)}</span>
              </button>
            </div>
            {isOpen &&
              category.subCategories.map((sub) => {
                const active = selected.subCategoryId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect({ categoryId: category.id, subCategoryId: sub.id })}
                    className={clsx(rowClasses(active), "ml-12 w-auto font-semibold")}
                  >
                    <span className="flex-1">{sub.name}</span>
                    <span className="text-xs text-muted tabular-nums">{formatQuantity(counts.get(sub.id) ?? 0)}</span>
                  </button>
                );
              })}
          </div>
        );
      })}
    </nav>
  );
}
