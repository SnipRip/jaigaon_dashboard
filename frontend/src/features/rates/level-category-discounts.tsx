"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { GlassModal } from "@/components/ui/glass-modal";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api-client";
import { saveCategoryDiscounts } from "./rates-api";
import type { PriceLevel } from "./types";

const schema = z.object({
  rows: z
    .array(
      z.object({
        categoryId: z.string().min(1, "Pick the category"),
        discountPct: z
          .string()
          .trim()
          .regex(/^\d{1,2}(\.\d{1,2})?$/, "0 to 99.99"),
      }),
    )
    .refine((rows) => new Set(rows.map((row) => row.categoryId)).size === rows.length, "Each category once"),
});
type Values = z.infer<typeof schema>;

interface LevelCategoryDiscountsProps {
  /** The level being edited; null keeps the dialog closed. */
  level: PriceLevel | null;
  /** Categories and sub-categories. */
  categories: SelectOption[];
  onClose: () => void;
  onSaved: () => void;
}

// A price level's own discount for some categories (iron 4%, cement 2%),
// over the level's overall figure. A sub-category's figure beats its
// category's.
export function LevelCategoryDiscounts({ level, categories, onClose, onSaved }: LevelCategoryDiscountsProps) {
  return (
    <GlassModal
      open={level !== null}
      onOpenChange={(open) => !open && onClose()}
      title={level ? `Category discounts of ${level.name}` : "Category discounts"}
      description={level ? `Off MRP. Categories not listed take the level's ${level.discountPct}%.` : undefined}
    >
      {level && <DiscountsForm key={level.id} level={level} categories={categories} onClose={onClose} onSaved={onSaved} />}
    </GlassModal>
  );
}

function DiscountsForm({ level, categories, onClose, onSaved }: Omit<LevelCategoryDiscountsProps, "level"> & { level: PriceLevel }) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { rows: level.categoryDiscounts.map((row) => ({ categoryId: row.categoryId, discountPct: String(row.discountPct) })) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const missingCategory = Array.isArray(errors.rows) && errors.rows.some((row) => row?.categoryId);
  const listError = missingCategory ? "Pick a category on every row." : (errors.rows?.root?.message ?? errors.rows?.message);

  const save = async (values: Values) => {
    setError(null);
    try {
      await saveCategoryDiscounts(
        level,
        values.rows.map((row) => ({ categoryId: row.categoryId, discountPct: Number(row.discountPct) })),
      );
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save. Check the connection and try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="flex flex-col gap-3.5">
      {fields.length === 0 && <p className="text-[13px] text-muted">No category has its own discount: every item takes {level.discountPct}% off MRP.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-start gap-2.5">
          <Controller
            control={control}
            name={`rows.${index}.categoryId`}
            render={({ field: select }) => (
              <SelectField label="Category" options={categories} value={select.value || undefined} onValueChange={select.onChange} />
            )}
          />
          <TextField label="Off MRP %" inputMode="decimal" error={errors.rows?.[index]?.discountPct?.message} {...register(`rows.${index}.discountPct`)} />
          <button
            type="button"
            aria-label="Remove this category"
            onClick={() => remove(index)}
            className="glass-control glass-press mt-5 flex size-9 items-center justify-center text-danger-strong hover:bg-danger-tint/80"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
      <div>
        <Button variant="outline" onClick={() => append({ categoryId: "", discountPct: String(level.discountPct) })}>
          <Plus aria-hidden="true" />
          Add a category
        </Button>
      </div>
      {listError && <FormMessage tone="error">{listError}</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save discounts"}
        </Button>
      </div>
    </form>
  );
}
