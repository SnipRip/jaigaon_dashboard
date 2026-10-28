"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CategoryFields } from "./category-fields";
import { categorySchema, type CategoryFormValues } from "./category-schema";
import type { ItemDefaults } from "./types";

export interface CategoryDraft {
  name: string;
  defaults: ItemDefaults;
}

export const toCategoryValues = (draft?: CategoryDraft): CategoryFormValues => ({
  name: draft?.name ?? "",
  hsn: draft?.defaults.hsn ?? "",
  gstRatePct: draft?.defaults.gstRatePct === undefined ? "" : String(draft.defaults.gstRatePct),
  unit: draft?.defaults.unit ?? "",
});

export const fromCategoryValues = (values: CategoryFormValues): CategoryDraft => ({
  name: values.name.trim(),
  defaults: {
    hsn: values.hsn || undefined,
    gstRatePct: values.gstRatePct === "" ? undefined : Number(values.gstRatePct),
    unit: values.unit || undefined,
  },
});

interface CategoryEditorProps {
  /** The category or sub-category being edited, or nothing for a new one. */
  draft?: CategoryDraft;
  parent?: CategoryDraft;
  units: string[];
  gstRates: number[];
  submitLabel: string;
  onSubmit: (draft: CategoryDraft) => void;
  onCancel?: () => void;
}

// The form for one category or sub-category. The workspace remounts it (by
// key) when another one is picked, so it always starts from that one's values.
export function CategoryEditor({ draft, parent, units, gstRates, submitLabel, onSubmit, onCancel }: CategoryEditorProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: toCategoryValues(draft) });

  const submit = handleSubmit((values) => {
    onSubmit(fromCategoryValues(values));
    reset(values);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <CategoryFields control={control} register={register} errors={errors} units={units} gstRates={gstRates} parent={parent} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={Boolean(draft) && !isDirty}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="neutral" disabled={!isDirty} onClick={() => reset()}>
            Discard changes
          </Button>
        )}
      </div>
    </form>
  );
}
