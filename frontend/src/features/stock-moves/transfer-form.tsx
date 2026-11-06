"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import type { ItemCatalog } from "@/features/items/item-rules";
import { PICKED_VEHICLE_HINT, useLiveVehicles, VehicleSelect } from "@/features/masters/vehicle-picker";
import { ApiError } from "@/lib/api-client";
import { useToday } from "@/lib/use-today";
import type { GodownView } from "@/types/item-master";
import type { VehicleView } from "@/types/vehicle";
import { emptyStockLine } from "./stock-line-schema";
import { StockLinesCard } from "./stock-lines-card";
import { createTransfer } from "./stock-moves-api";
import { transferSchema, type TransferFormValues } from "./transfer-schema";

interface TransferFormProps {
  catalog: ItemCatalog;
  /** Active godowns. */
  godowns: GodownView[];
  onSaved: () => Promise<void>;
}

// Moving stock from one godown to another. On save the backend takes each
// line out of the source oldest first, as a sale would, and lands it in the
// destination at the same cost; it refuses more than the source holds.
export function TransferForm({ catalog, godowns, onSaved }: TransferFormProps) {
  const today = useToday();
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const source = godowns.find((godown) => godown.isDefault) ?? godowns[0];
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: "",
      fromGodownId: source?.id ?? "",
      toGodownId: godowns.find((godown) => godown.id !== source?.id)?.id ?? "",
      vehicleNumber: "",
      vehicleId: "",
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

  const [fromGodownId, toGodownId, vehicleId] = useWatch({ control, name: ["fromGodownId", "toGodownId", "vehicleId"] });
  const vehicles = useLiveVehicles();
  /** A vehicle from the master shows its number read-only; the server records the master's number. */
  const pickVehicle = (vehicle: VehicleView | null) => {
    setValue("vehicleId", vehicle?.id ?? "");
    if (vehicle) setValue("vehicleNumber", vehicle.number, { shouldValidate: true });
  };
  const nameOf = (id: string) => godowns.find((godown) => godown.id === id)?.name;
  const godownOptions = godowns.map((godown) => ({ value: godown.id, label: godown.name }));

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      try {
        const saved = await createTransfer({
          date: values.date,
          fromGodownId: values.fromGodownId,
          toGodownId: values.toGodownId,
          vehicleNumber: values.vehicleId ? null : values.vehicleNumber || null,
          vehicleId: values.vehicleId || null,
          notes: values.notes || null,
          lines: values.lines.map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) })),
        });
        await onSaved();
        router.push(`/stock-transfers/${saved.id}`);
      } catch (error) {
        setResult(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setResult("Some fields need attention. See the ones marked in red above."),
  );

  if (godowns.length < 2) {
    return (
      <GlassCard className="flex flex-col gap-2">
        <CardTitle>New stock transfer</CardTitle>
        <p className="text-sm font-semibold text-muted">
          A transfer needs two godowns. Add another on{" "}
          <Link href="/masters/godowns" className="text-brand hover:underline">
            Godowns
          </Link>
          .
        </p>
      </GlassCard>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="@container flex max-w-[960px] min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New stock transfer</CardTitle>
            <StatusChip tone="neutral">Numbered on save</StatusChip>
          </div>
          <div className="grid items-start gap-3.5 @xl:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="fromGodownId"
                render={({ field }) => <SelectField label="From godown" options={godownOptions} value={field.value || undefined} onValueChange={field.onChange} />}
              />
              {errors.fromGodownId && <p className="text-xs font-semibold text-danger-strong">{errors.fromGodownId.message}</p>}
            </div>
            <ArrowRight aria-hidden="true" className="hidden size-5 text-muted @xl:mt-[34px] @xl:block" />
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="toGodownId"
                render={({ field }) => <SelectField label="To godown" options={godownOptions} value={field.value || undefined} onValueChange={field.onChange} />}
              />
              {errors.toGodownId && <p className="text-xs font-semibold text-danger-strong">{errors.toGodownId.message}</p>}
            </div>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
            <VehicleSelect vehicles={vehicles} vehicleId={vehicleId} onPick={pickVehicle} />
            <TextField
              label="Vehicle number"
              hint={vehicleId ? PICKED_VEHICLE_HINT : "Optional"}
              placeholder="WB73E1234"
              readOnly={Boolean(vehicleId)}
              error={errors.vehicleNumber?.message}
              {...register("vehicleNumber")}
            />
          </div>
        </GlassCard>

        <StockLinesCard
          catalog={catalog}
          godownId={fromGodownId}
          godownName={nameOf(fromGodownId)}
          adding={false}
          valueHint="Each item moves at what it cost, oldest stock first, so the stock's value stays the same. Nothing is bought or sold."
        />

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes" placeholder="For us only" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone="error">{result}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : `Move to ${nameOf(toGodownId) ?? "the godown"}`}
            </Button>
            <Link href="/stock-transfers" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Cancel
            </Link>
          </div>
        </GlassCard>
      </form>
    </FormProvider>
  );
}
