"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { latestRate } from "./hsn-rules";
import { hsnSchema, type HsnFormValues } from "./hsn-schema";
import type { HsnCode } from "./types";

interface HsnFormProps {
  /** The code being edited, or nothing for a new one. */
  hsn?: HsnCode;
  gstRates: number[];
  /** Codes already in the master, to stop duplicates. */
  takenCodes: string[];
  /** Saves through the backend; resolves to an error message, or null when saved. */
  onSave: (values: HsnFormValues) => Promise<string | null>;
  onCancel?: () => void;
}

// One HSN / SAC code. Changing the rate adds a dated entry instead of
// overwriting, so documents dated before the change keep the old rate.
export function HsnForm({ hsn, gstRates, takenCodes, onSave, onCancel }: HsnFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<HsnFormValues>({
    resolver: zodResolver(hsnSchema),
    defaultValues: {
      kind: hsn?.kind ?? "HSN",
      code: hsn?.code ?? "",
      description: hsn?.description ?? "",
      ratePct: hsn ? String(latestRate(hsn)) : "",
      from: hsn?.rates.at(-1)?.from ?? "",
      reverseCharge: hsn?.reverseCharge ?? false,
      notes: hsn?.notes ?? "",
    },
  });

  const [saveError, setSaveError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    if (!hsn && takenCodes.includes(values.code)) {
      setError("code", { message: "This code is already in the master" });
      return;
    }
    const problem = await onSave(values);
    setSaveError(problem);
    if (!problem) reset(values);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <FilterGroup label="Code type">
            <FilterChip selected={field.value === "HSN"} disabled={Boolean(hsn)} onClick={() => field.onChange("HSN")}>
              HSN · goods
            </FilterChip>
            <FilterChip selected={field.value === "SAC"} disabled={Boolean(hsn)} onClick={() => field.onChange("SAC")}>
              SAC · services
            </FilterChip>
          </FilterGroup>
        )}
      />
      <div className="grid gap-3.5 sm:grid-cols-[160px_1fr]">
        <TextField label="Code" inputMode="numeric" disabled={Boolean(hsn)} error={errors.code?.message} {...register("code")} />
        <TextField label="Description" error={errors.description?.message} {...register("description")} />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Controller
          control={control}
          name="ratePct"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <SelectField
                label="GST rate"
                options={gstRates.map((rate) => ({ value: String(rate), label: `${rate}%` }))}
                value={field.value || undefined}
                onValueChange={field.onChange}
              />
              {errors.ratePct && <p className="text-xs font-semibold text-danger-strong">{errors.ratePct.message}</p>}
            </div>
          )}
        />
        <TextField
          label="Rate applies from"
          type="date"
          hint={hsn ? "A new date adds a rate from that day; earlier documents keep the old one. The same date corrects that rate." : undefined}
          error={errors.from?.message}
          {...register("from")}
        />
      </div>
      <Controller
        control={control}
        name="reverseCharge"
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Reverse charge</span>
            <FilterGroup label="Reverse charge">
              <FilterChip selected={!field.value} onClick={() => field.onChange(false)}>
                No
              </FilterChip>
              <FilterChip selected={field.value} onClick={() => field.onChange(true)}>
                Yes
              </FilterChip>
            </FilterGroup>
            <p className="text-[11.5px] text-muted">
              Yes when we pay the GST instead of the supplier, as for truck freight from a transport agency.
            </p>
          </div>
        )}
      />
      <TextField label="Notes" error={errors.notes?.message} {...register("notes")} />
      {saveError && <FormMessage tone="error">{saveError}</FormMessage>}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={(Boolean(hsn) && !isDirty) || isSubmitting}>
          {isSubmitting ? "Saving…" : hsn ? "Save code" : "Add code"}
        </Button>
        {onCancel && (
          <Button variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
