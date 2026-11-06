"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import type { ItemCatalog } from "@/features/items/item-rules";
import { ApiError } from "@/lib/api-client";
import { useToday } from "@/lib/use-today";
import type { GodownView } from "@/types/item-master";
import type { AdjustmentDirectionView } from "@/types/stock-moves";
import { adjustmentSchema, type AdjustmentFormValues } from "./adjustment-schema";
import { emptyStockLine } from "./stock-line-schema";
import { StockLinesCard } from "./stock-lines-card";
import { DIRECTION_TEXT, reasonsFor } from "./stock-move-rules";
import { createAdjustment } from "./stock-moves-api";

interface AdjustmentFormProps {
  catalog: ItemCatalog;
  /** Active godowns. */
  godowns: GodownView[];
  onSaved: () => Promise<void>;
}

// Tally's stock journal for stock that is neither bought nor sold. Taking
// stock out writes it off at what it cost, oldest first; adding stock makes
// a new batch at the cost typed.
export function AdjustmentForm({ catalog, godowns, onSaved }: AdjustmentFormProps) {
  const today = useToday();
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      date: "",
      godownId: (godowns.find((godown) => godown.isDefault) ?? godowns[0])?.id ?? "",
      direction: "OUT",
      reason: "DAMAGED",
      notes: "",
      lines: [emptyStockLine],
    },
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [godownId, direction, reason] = useWatch({ control, name: ["godownId", "direction", "reason"] });
  const adding = direction === "IN";
  const godownName = godowns.find((godown) => godown.id === godownId)?.name;

  const pickDirection = (next: AdjustmentDirectionView) => {
    setValue("direction", next);
    // Keep the reason only when it fits the new direction.
    if (!reasonsFor(next).some((option) => option.value === getValues("reason"))) setValue("reason", reasonsFor(next)[0].value);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      try {
        const saved = await createAdjustment({
          date: values.date,
          godownId: values.godownId,
          direction: values.direction,
          reason: values.reason,
          notes: values.notes || null,
          lines: values.lines.map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity),
            ...(values.direction === "IN" ? { rate: Number(line.rate) } : {}),
          })),
        });
        await onSaved();
        router.push(`/stock-adjustments/${saved.id}`);
      } catch (error) {
        setResult(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setResult("Some fields need attention. See the ones marked in red above."),
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="@container flex max-w-[960px] min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New stock adjustment</CardTitle>
            <StatusChip tone="neutral">Numbered on save</StatusChip>
          </div>
          <FilterGroup label="Stock is">
            {(["OUT", "IN"] as const).map((option) => (
              <FilterChip key={option} selected={direction === option} onClick={() => pickDirection(option)}>
                {DIRECTION_TEXT[option]}
              </FilterChip>
            ))}
          </FilterGroup>
          <div className="grid items-start gap-3.5 @xl:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="godownId"
                render={({ field }) => (
                  <SelectField label="Godown" options={godowns.map((godown) => ({ value: godown.id, label: godown.name }))} value={field.value || undefined} onValueChange={field.onChange} />
                )}
              />
              {errors.godownId && <p className="text-xs font-semibold text-danger-strong">{errors.godownId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <SelectField
                    label="Reason"
                    options={reasonsFor(direction).map((option) => ({ value: option.value, label: option.label }))}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errors.reason && <p className="text-xs font-semibold text-danger-strong">{errors.reason.message}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>
        </GlassCard>

        <StockLinesCard
          catalog={catalog}
          godownId={godownId}
          godownName={godownName}
          adding={adding}
          valueHint={
            adding
              ? "Stock added comes in at the cost typed, as a new batch that sales draw in date order."
              : "Stock taken out is written off at what it cost, oldest stock first."
          }
        />

        <GlassCard className="flex flex-col gap-3">
          <TextField
            label="Notes"
            placeholder={reason === "OTHER" ? "Say why" : "For us only"}
            hint={reason === "OTHER" ? undefined : "Optional"}
            error={errors.notes?.message}
            {...register("notes")}
          />
          {result && <FormMessage tone="error">{result}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" variant={adding ? "primary" : "danger"} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : adding ? "Add the stock" : "Write off the stock"}
            </Button>
            <Link href="/stock-adjustments" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Cancel
            </Link>
          </div>
        </GlassCard>
      </form>
    </FormProvider>
  );
}
