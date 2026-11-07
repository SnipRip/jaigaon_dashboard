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
import { createCategory, deleteCategory, updateCategory, type ItemMasters } from "./catalog-api";
import { CategoryEditor, type CategoryDraft } from "./category-editor";
import { saveErrorText } from "./item-form";
import { countItems } from "./item-rules";

interface CategoriesWorkspaceProps {
  masters: ItemMasters;
  /** Reloads the item master after a change. */
  onChanged: () => Promise<void>;
  units: string[];
  gstRates: number[];
}

interface Selection {
  categoryId: string;
  subCategoryId?: string;
}

/** Which "add" dialog is open: a new category, or a sub-category under one. */
type Adding = { level: "category" } | { level: "sub-category"; categoryId: string } | null;

// Category management, saved through the backend. Only two levels: a
// sub-category has no sub-categories of its own.
export function CategoriesWorkspace({ masters, onChanged, units, gstRates }: CategoriesWorkspaceProps) {
  const { categories, items } = masters.catalog;
  const [selection, setSelection] = useState<Selection>({ categoryId: categories[0]?.id ?? "" });
  const [adding, setAdding] = useState<Adding>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const counts = useMemo(() => countItems(items), [items]);
  const category = categories.find((candidate) => candidate.id === selection.categoryId);
  const sub = category?.subCategories.find((candidate) => candidate.id === selection.subCategoryId);
  const selected = sub ?? category;
  const itemCount = selected ? (counts.get(selected.id) ?? 0) : 0;

  // Runs one backend call, reloads, and reports. Resolves true on success.
  const run = async (call: () => Promise<unknown>, done: string) => {
    try {
      await call();
      await onChanged();
      setNotice({ tone: "success", text: done });
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: saveErrorText(error) });
      return false;
    }
  };

  const saveSelected = (draft: CategoryDraft) =>
    selected ? run(() => updateCategory(masters, selected.id, draft), `${draft.name} saved.`) : Promise.resolve(false);

  const add = async (draft: CategoryDraft) => {
    const parentId = adding?.level === "sub-category" ? adding.categoryId : undefined;
    let createdId = "";
    const saved = await run(async () => {
      createdId = (await createCategory(masters, draft, parentId)).id;
    }, `${draft.name} added.`);
    if (saved) {
      setSelection(parentId ? { categoryId: parentId, subCategoryId: createdId } : { categoryId: createdId });
      setAdding(null);
    }
    return saved;
  };

  const removeSelected = async () => {
    if (!category || !selected) return;
    const removed = await run(() => deleteCategory(selected.id), `${selected.name} deleted.`);
    if (removed) {
      setSelection(sub ? { categoryId: category.id } : { categoryId: categories.find((candidate) => candidate.id !== category.id)?.id ?? "" });
    }
  };

  const deleteBlocker =
    itemCount > 0
      ? `${formatQuantity(itemCount)} ${itemCount === 1 ? "item uses" : "items use"} it. Move them first.`
      : !sub && category && category.subCategories.length > 0
        ? "Remove its sub-categories first."
        : null;

  const addingParent = adding?.level === "sub-category" ? categories.find((candidate) => candidate.id === adding.categoryId) : undefined;

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
              <li key={candidate.id} className="glass-inset flex flex-col gap-1 rounded-(--radius-tile) p-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={categoryActive}
                    onClick={() => setSelection({ categoryId: candidate.id })}
                    className={clsx(
                      "flex min-h-8 flex-1 items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-semibold transition-colors",
                      categoryActive ? "glass-selected" : "hover:bg-white/60",
                    )}
                  >
                    <span className="flex-1">{candidate.name}</span>
                    <span className="text-xs font-medium text-muted tabular-nums">
                      {formatQuantity(counts.get(candidate.id) ?? 0)} items
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Add a sub-category to ${candidate.name}`}
                    onClick={() => setAdding({ level: "sub-category", categoryId: candidate.id })}
                    className="glass-control glass-press flex size-8 shrink-0 items-center justify-center text-brand hover:bg-brand-tint/60"
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
                              "flex min-h-[30px] w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors",
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

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        {selected && category ? (
          <GlassCard className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{selected.name}</CardTitle>
              <StatusChip tone={sub ? "neutral" : "brand"}>{sub ? `Sub-category of ${category.name}` : "Category"}</StatusChip>
              <span className="ml-auto text-xs font-medium text-muted">{formatQuantity(itemCount)} items</span>
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
              <Button variant="danger" disabled={Boolean(deleteBlocker)} onClick={() => void removeSelected()}>
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
        {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}
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
