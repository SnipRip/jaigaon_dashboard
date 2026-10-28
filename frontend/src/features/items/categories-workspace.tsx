"use client";

import clsx from "clsx";
import { FolderPlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { CategoryEditor, type CategoryDraft } from "./category-editor";
import { countItems } from "./item-rules";
import type { Category, Item } from "./types";

interface CategoriesWorkspaceProps {
  initialCategories: Category[];
  items: Item[];
  units: string[];
  gstRates: number[];
}

interface Selection {
  categoryId: string;
  subCategoryId?: string;
}

/** Which "add" dialog is open: a new category, or a sub-category under one. */
type Adding = { level: "category" } | { level: "sub-category"; categoryId: string } | null;

const newId = () => crypto.randomUUID();

// Category management. Changes live in this page's memory only until the
// item master is connected to the database, which the page says.
export function CategoriesWorkspace({ initialCategories, items, units, gstRates }: CategoriesWorkspaceProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [selection, setSelection] = useState<Selection>({ categoryId: initialCategories[0].id });
  const [adding, setAdding] = useState<Adding>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => countItems(items), [items]);
  const category = categories.find((candidate) => candidate.id === selection.categoryId);
  const sub = category?.subCategories.find((candidate) => candidate.id === selection.subCategoryId);
  const selected = sub ?? category;
  const itemCount = selected ? (counts.get(selected.id) ?? 0) : 0;

  const updateCategory = (categoryId: string, change: (category: Category) => Category) =>
    setCategories((current) => current.map((candidate) => (candidate.id === categoryId ? change(candidate) : candidate)));

  const saveSelected = (draft: CategoryDraft) => {
    if (!category) return;
    if (sub) {
      updateCategory(category.id, (current) => ({
        ...current,
        subCategories: current.subCategories.map((candidate) => (candidate.id === sub.id ? { ...candidate, ...draft } : candidate)),
      }));
    } else {
      updateCategory(category.id, (current) => ({ ...current, ...draft }));
    }
    setNotice(`${draft.name} updated on this page. It is not saved to the database yet.`);
  };

  const add = (draft: CategoryDraft) => {
    const id = newId();
    if (adding?.level === "sub-category") {
      updateCategory(adding.categoryId, (current) => ({ ...current, subCategories: [...current.subCategories, { id, ...draft }] }));
      setSelection({ categoryId: adding.categoryId, subCategoryId: id });
    } else {
      setCategories((current) => [...current, { id, ...draft, subCategories: [] }]);
      setSelection({ categoryId: id });
    }
    setAdding(null);
    setNotice(`${draft.name} added on this page. It is not saved to the database yet.`);
  };

  const removeSelected = () => {
    if (!category || !selected) return;
    if (sub) {
      updateCategory(category.id, (current) => ({
        ...current,
        subCategories: current.subCategories.filter((candidate) => candidate.id !== sub.id),
      }));
      setSelection({ categoryId: category.id });
    } else {
      const remaining = categories.filter((candidate) => candidate.id !== category.id);
      setCategories(remaining);
      setSelection({ categoryId: remaining[0]?.id ?? "" });
    }
    setNotice(`${selected.name} removed on this page.`);
  };

  const deleteBlocker =
    itemCount > 0
      ? `${formatQuantity(itemCount)} ${itemCount === 1 ? "item uses" : "items use"} it. Move them first.`
      : !sub && category && category.subCategories.length > 0
        ? "Remove its sub-categories first."
        : null;

  const addingParent = adding?.level === "sub-category" ? categories.find((candidate) => candidate.id === adding.categoryId) : undefined;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <GlassCard className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Categories · {categories.length}</CardTitle>
          <div className="flex gap-2">
            <Link href="/items" className={buttonClasses("neutral")}>
              Back to items
            </Link>
            <Button onClick={() => setAdding({ level: "category" })}>
              <Plus aria-hidden="true" className="size-[18px]" />
              New category
            </Button>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {categories.map((candidate) => {
            const categoryActive = selection.categoryId === candidate.id && !selection.subCategoryId;
            return (
              <li key={candidate.id} className="glass-inset flex flex-col gap-1 rounded-[18px] p-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={categoryActive}
                    onClick={() => setSelection({ categoryId: candidate.id })}
                    className={clsx(
                      "glass-press flex min-h-11 flex-1 items-center gap-2 rounded-full px-3.5 text-left text-sm font-extrabold",
                      categoryActive ? "glass-selected" : "hover:bg-white/60",
                    )}
                  >
                    <span className="flex-1">{candidate.name}</span>
                    <span className="text-xs font-bold text-muted tabular-nums">
                      {formatQuantity(counts.get(candidate.id) ?? 0)} items
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Add a sub-category to ${candidate.name}`}
                    onClick={() => setAdding({ level: "sub-category", categoryId: candidate.id })}
                    className="glass-control glass-press flex size-11 shrink-0 items-center justify-center text-brand hover:bg-white/80"
                  >
                    <FolderPlus aria-hidden="true" className="size-[18px]" />
                  </button>
                </div>
                {candidate.subCategories.length > 0 && (
                  <ul className="ml-4 flex flex-col gap-0.5 border-l border-line pl-2">
                    {candidate.subCategories.map((subCategory) => {
                      const active = selection.subCategoryId === subCategory.id;
                      return (
                        <li key={subCategory.id}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelection({ categoryId: candidate.id, subCategoryId: subCategory.id })}
                            className={clsx(
                              "glass-press flex min-h-11 w-full items-center gap-2 rounded-full px-3.5 text-left text-[13px] font-bold",
                              active ? "glass-selected" : "text-ink-soft hover:bg-white/60",
                            )}
                          >
                            <span className="flex-1">{subCategory.name}</span>
                            <span className="text-xs text-muted tabular-nums">{formatQuantity(counts.get(subCategory.id) ?? 0)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </GlassCard>

      <div className="flex flex-col gap-4 xl:sticky xl:top-4">
        {selected && category ? (
          <GlassCard className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{selected.name}</CardTitle>
              <StatusChip tone={sub ? "neutral" : "brand"}>{sub ? `Sub-category of ${category.name}` : "Category"}</StatusChip>
              <span className="ml-auto text-xs font-bold text-muted">{formatQuantity(itemCount)} items</span>
            </div>
            <p className="text-sm font-medium text-muted">
              Defaults set here apply to every item below unless a sub-category, item group or item sets its own.
            </p>
            <CategoryEditor
              key={selected.id}
              draft={selected}
              parent={sub ? category : undefined}
              units={units}
              gstRates={gstRates}
              submitLabel={`Save ${sub ? "sub-category" : "category"}`}
              onSubmit={saveSelected}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button variant="danger" disabled={Boolean(deleteBlocker)} onClick={removeSelected}>
                <Trash2 aria-hidden="true" className="size-[18px]" />
                Delete {sub ? "sub-category" : "category"}
              </Button>
              {deleteBlocker && <span className="text-xs font-semibold text-muted">{deleteBlocker}</span>}
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="text-sm font-semibold text-muted">Pick a category or sub-category to edit it.</p>
          </GlassCard>
        )}
        {notice && <FormMessage tone="success">{notice}</FormMessage>}
      </div>

      <GlassModal
        open={adding !== null}
        onOpenChange={(open) => !open && setAdding(null)}
        title={addingParent ? `New sub-category in ${addingParent.name}` : "New category"}
        description="Leave a default blank to inherit it or set it lower down."
      >
        {adding && (
          <CategoryEditor
            parent={addingParent}
            units={units}
            gstRates={gstRates}
            submitLabel={addingParent ? "Add sub-category" : "Add category"}
            onSubmit={add}
            onCancel={() => setAdding(null)}
          />
        )}
      </GlassModal>
    </div>
  );
}
