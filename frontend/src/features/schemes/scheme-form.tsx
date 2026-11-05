"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormMessage } from "@/components/ui/form-message";
import { MultiPickField } from "@/components/ui/multi-pick-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { fieldLabelClasses } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api-client";
import type { SchemeView } from "@/types/scheme";
import { benefitText, BENEFIT_OPTIONS, conditionText, LEVEL_OPTIONS, PARTY_SCOPE_OPTIONS, RATE_SOURCE_OPTIONS } from "./scheme-text";
import { schemeSchema, type SchemeFormValues } from "./scheme-schema";
import { fromTargetKey, saveScheme, targetKey } from "./schemes-api";

interface SchemeFormProps {
  scheme?: SchemeView;
  today: string;
  /** Items, categories and brands in one list ("item:…", "category:…", "brand:…"). */
  targetOptions: (SelectOption & { group: string })[];
  customerOptions: SelectOption[];
  onSaved: (scheme: SchemeView) => void;
  onCancel: () => void;
}

const text = (value: number | null) => (value === null ? "" : String(value));
const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

const VALUE_LABEL: Record<SchemeFormValues["benefit"], string> = {
  PERCENT: "Discount %",
  AMOUNT_PER_UNIT: "₹ off per unit",
  FLAT_AMOUNT: "₹ off",
  FREE_QUANTITY: "Units free",
};

function toFormValues(scheme: SchemeView | undefined, today: string): SchemeFormValues {
  return {
    name: scheme?.name ?? "",
    description: scheme?.description ?? "",
    level: scheme?.level ?? "LINE",
    benefit: scheme?.benefit ?? "PERCENT",
    value: text(scheme?.value ?? null),
    buyQuantity: text(scheme?.buyQuantity ?? null),
    maxDiscount: text(scheme?.maxDiscount ?? null),
    minQuantity: text(scheme?.minQuantity ?? null),
    minValue: text(scheme?.minValue ?? null),
    targets: scheme?.targets.map(targetKey) ?? [],
    partyScope: scheme?.partyScope ?? "ALL",
    partyIds: scheme?.partyIds ?? [],
    // A new scheme skips negotiated special rates unless told otherwise.
    rateSources: scheme?.rateSources ?? ["SHEET", "MANUAL"],
    stackable: scheme?.stackable ?? false,
    validFrom: scheme?.validFrom ?? today,
    validTill: scheme?.validTill ?? "",
    notes: scheme?.notes ?? "",
  };
}

// One scheme: what it gives, on which items, to which customers, on which
// kinds of rate, and when. Fields that do not fit the chosen benefit are
// hidden and sent empty, so a switched benefit leaves nothing behind.
export function SchemeForm({ scheme, today, targetOptions, customerOptions, onSaved, onCancel }: SchemeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SchemeFormValues>({ resolver: zodResolver(schemeSchema), defaultValues: toFormValues(scheme, today) });
  const [level, benefit, partyScope, rateSources, stackable, value, buyQuantity, maxDiscount, minQuantity, minValue] = useWatch({
    control,
    name: ["level", "benefit", "partyScope", "rateSources", "stackable", "value", "buyQuantity", "maxDiscount", "minQuantity", "minValue"],
  });
  const benefits = BENEFIT_OPTIONS.filter((option) => option.levels.includes(level));
  const capped = benefit === "PERCENT" || benefit === "AMOUNT_PER_UNIT";

  const submit = handleSubmit(async (values) => {
    setError(null);
    const free = values.benefit === "FREE_QUANTITY";
    try {
      const saved = await saveScheme(scheme?.id, {
        name: values.name,
        description: values.description.trim() || null,
        level: values.level,
        benefit: values.benefit,
        value: Number(values.value),
        buyQuantity: free ? numberOrNull(values.buyQuantity) : null,
        maxDiscount: values.benefit === "PERCENT" || values.benefit === "AMOUNT_PER_UNIT" ? numberOrNull(values.maxDiscount) : null,
        minQuantity: values.level === "LINE" ? numberOrNull(values.minQuantity) : null,
        minValue: numberOrNull(values.minValue),
        targets: values.targets.map(fromTargetKey),
        partyScope: values.partyScope,
        partyIds: values.partyScope === "SELECTED" ? values.partyIds : [],
        rateSources: values.rateSources,
        stackable: values.stackable,
        validFrom: values.validFrom,
        validTill: values.validTill || null,
        notes: values.notes.trim() || null,
      });
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save. Check the connection and try again.");
    }
  });

  const preview =
    Number(value) > 0
      ? `${benefitText({ benefit, value: Number(value), buyQuantity: numberOrNull(buyQuantity), maxDiscount: capped ? numberOrNull(maxDiscount) : null })} · ${conditionText({ level, minQuantity: level === "LINE" ? numberOrNull(minQuantity) : null, minValue: numberOrNull(minValue) })}`
      : undefined;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField label="Scheme name" placeholder="Diwali TMT offer" error={errors.name?.message} {...register("name")} />
        <TextField label="Description" placeholder="Printed nowhere; for staff" error={errors.description?.message} {...register("description")} />
        <SelectField
          label="Applies to"
          options={LEVEL_OPTIONS}
          value={level}
          onValueChange={(next) => {
            setValue("level", next as SchemeFormValues["level"]);
            if (!BENEFIT_OPTIONS.find((option) => option.value === benefit)?.levels.includes(next as SchemeFormValues["level"])) setValue("benefit", "PERCENT");
          }}
        />
        <SelectField label="Benefit" options={benefits} value={benefit} onValueChange={(next) => setValue("benefit", next as SchemeFormValues["benefit"])} />
        <TextField label={VALUE_LABEL[benefit]} inputMode="decimal" error={errors.value?.message} {...register("value")} />
        {benefit === "FREE_QUANTITY" && (
          <TextField label="For every … bought" inputMode="decimal" hint="Buy 40, get 1 free: 40 here, 1 above" error={errors.buyQuantity?.message} {...register("buyQuantity")} />
        )}
        {capped && <TextField label="Maximum discount (₹)" inputMode="decimal" hint={level === "LINE" ? "Per line. Empty: no cap" : "Per order. Empty: no cap"} error={errors.maxDiscount?.message} {...register("maxDiscount")} />}
        {level === "LINE" && <TextField label="Minimum quantity" inputMode="decimal" hint="Base units on the line. Empty: any" error={errors.minQuantity?.message} {...register("minQuantity")} />}
        <TextField
          label={level === "LINE" ? "Minimum line value (₹)" : "Minimum order value (₹)"}
          inputMode="decimal"
          hint="Before GST. Empty: any"
          error={errors.minValue?.message}
          {...register("minValue")}
        />
      </div>

      <Controller
        control={control}
        name="targets"
        render={({ field }) => (
          <MultiPickField
            label="On these items"
            options={targetOptions}
            values={field.value}
            onChange={field.onChange}
            emptyText="Every item"
            addLabel="Add item, category or brand"
            hint="A category includes its sub-categories. Empty: every item."
          />
        )}
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <SelectField label="For" options={PARTY_SCOPE_OPTIONS} value={partyScope} onValueChange={(next) => setValue("partyScope", next as SchemeFormValues["partyScope"])} />
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClasses}>On these rates</span>
          <div role="group" aria-label="On these rates" className="flex flex-wrap gap-1.5">
            {RATE_SOURCE_OPTIONS.map((option) => {
              const picked = rateSources.includes(option.value);
              return (
                <FilterChip
                  key={option.value}
                  type="button"
                  selected={picked}
                  aria-pressed={picked}
                  title={option.hint}
                  onClick={() => setValue("rateSources", picked ? rateSources.filter((source) => source !== option.value) : [...rateSources, option.value], { shouldValidate: true })}
                >
                  {option.label}
                </FilterChip>
              );
            })}
          </div>
          {errors.rateSources && <p className="text-xs font-semibold text-danger-strong">{errors.rateSources.message}</p>}
        </div>
      </div>
      {partyScope === "SELECTED" && (
        <Controller
          control={control}
          name="partyIds"
          render={({ field }) => (
            <MultiPickField
              label="Customers"
              options={customerOptions}
              values={field.value}
              onChange={(next) => setValue("partyIds", next, { shouldValidate: true })}
              emptyText="None picked yet"
              addLabel="Add customer"
              error={errors.partyIds?.message}
            />
          )}
        />
      )}

      <div className="grid gap-3.5 sm:grid-cols-3">
        <TextField label="Valid from" type="date" error={errors.validFrom?.message} {...register("validFrom")} />
        <TextField label="Valid till" type="date" hint="Empty: until withdrawn" error={errors.validTill?.message} {...register("validTill")} />
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClasses}>With other schemes</span>
          <div role="group" aria-label="With other schemes" className="flex flex-wrap gap-1.5">
            <FilterChip type="button" selected={!stackable} aria-pressed={!stackable} onClick={() => setValue("stackable", false)}>
              Best one only
            </FilterChip>
            <FilterChip type="button" selected={stackable} aria-pressed={stackable} onClick={() => setValue("stackable", true)}>
              Adds on
            </FilterChip>
          </div>
        </div>
      </div>
      <TextField label="Notes" placeholder="Company circular, approval" error={errors.notes?.message} {...register("notes")} />

      {preview && <p className="glass-inset rounded-(--radius-tile) px-3.5 py-2.5 text-[13px] font-semibold text-ink">{preview}</p>}
      <p className="text-xs font-semibold text-muted">
        &ldquo;Best one only&rdquo;: when several such schemes fit a line, the one that gives most applies. &ldquo;Adds on&rdquo; schemes apply on top. Free units never compete with rupees off.
      </p>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {scheme ? "Save changes" : "Add scheme"}
        </Button>
        <Button variant="neutral" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
