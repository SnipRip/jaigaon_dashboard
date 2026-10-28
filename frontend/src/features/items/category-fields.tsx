"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { CategoryFormValues } from "./category-schema";
import type { ItemDefaults } from "./types";
import { NONE } from "./use-overrides";

interface CategoryFieldsProps {
  control: Control<CategoryFormValues>;
  register: UseFormRegister<CategoryFormValues>;
  errors: FieldErrors<CategoryFormValues>;
  units: string[];
  gstRates: number[];
  /** A sub-category's parent defaults, shown as what a blank field falls back to. */
  parent?: { name: string; defaults: ItemDefaults };
}

// Name plus the defaults every item below inherits. Shared by the editor
// panel and the "add" dialog.
export function CategoryFields({ control, register, errors, units, gstRates, parent }: CategoryFieldsProps) {
  const fallback = (value: string | number | undefined, suffix = "") =>
    parent
      ? value === undefined
        ? `Blank: not set on ${parent.name} either`
        : `Blank: uses ${value}${suffix} from ${parent.name}`
      : "Blank: set on each sub-category or item";
  const inheritLabel = parent ? `Same as ${parent.name}` : "Not set here";

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
      </div>
      <TextField
        label="Default HSN code"
        inputMode="numeric"
        hint={fallback(parent?.defaults.hsn)}
        error={errors.hsn?.message}
        {...register("hsn")}
      />
      <Controller
        control={control}
        name="gstRatePct"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <SelectField
              label="Default GST rate"
              options={[{ value: NONE, label: inheritLabel }, ...gstRates.map((rate) => ({ value: String(rate), label: `${rate}%` }))]}
              value={field.value || NONE}
              onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
            />
            <p className="text-xs font-semibold text-muted">{fallback(parent?.defaults.gstRatePct, "%")}</p>
          </div>
        )}
      />
      <Controller
        control={control}
        name="unit"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <SelectField
              label="Default base unit"
              options={[{ value: NONE, label: inheritLabel }, ...units.map((unit) => ({ value: unit, label: unit }))]}
              value={field.value || NONE}
              onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
            />
            <p className="text-xs font-semibold text-muted">{fallback(parent?.defaults.unit)}</p>
          </div>
        )}
      />
    </div>
  );
}
