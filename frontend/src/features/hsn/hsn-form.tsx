"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
  onSave: (hsn: HsnCode) => void;
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
    formState: { errors, isDirty },
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

  const submit = handleSubmit((values) => {
    if (!hsn && takenCodes.includes(values.code)) {
      setError("code", { message: "This code is already in the master" });
      return;
    }
    const rate = Number(values.ratePct);
    const previous = hsn?.rates ?? [];
    const last = previous.at(-1);
    const rates =
      last && last.ratePct === rate
        ? previous
        : [...previous.filter((change) => change.from < values.from), { ratePct: rate, from: values.from }];
    onSave({
      code: values.code,
      kind: values.kind,
      description: values.description,
      rates,
      reverseCharge: values.reverseCharge || undefined,
      notes: values.notes || undefined,
    });
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
          hint={hsn ? "A new rate is added from this date; the old one stays for earlier documents" : undefined}
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
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={Boolean(hsn) && !isDirty}>
          {hsn ? "Save code" : "Add code"}
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
