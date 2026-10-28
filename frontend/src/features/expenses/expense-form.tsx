"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { ALLOCATIONS } from "@/features/masters/expense-heads-master";
import type { ExpenseHead } from "@/features/masters/types";
import { formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { expenseGst, expenseTotal } from "./expense-rules";
import { expenseSchema, type ExpenseFormValues } from "./expense-schema";
import type { ExpenseAllocation } from "./types";

export interface AllocationTarget {
  kind: ExpenseAllocation["kind"];
  id: string;
  label: string;
}

interface ExpenseFormProps {
  heads: ExpenseHead[];
  vendors: SelectOption[];
  accounts: SelectOption[];
  targets: AllocationTarget[];
  suggestedNumber: string;
}

const NOT_PAID = "unpaid";
const RATES = [0, 5, 12, 18, 28];

// One expense: what it was, who was paid and from where, and whose profit it
// reduces. The head fills in GST and allocation; both can be changed.
export function ExpenseForm({ heads, vendors, accounts, targets, suggestedNumber }: ExpenseFormProps) {
  const today = useToday();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: "",
      headId: "",
      description: "",
      amount: "",
      gstRatePct: "0",
      payeeKind: "other",
      vendorId: "",
      payee: "",
      paidFrom: accounts[0]?.value ?? NOT_PAID,
      reference: "",
      allocationKind: "overhead",
      targetId: "",
    },
  });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [headId, amount, gstRatePct, payeeKind, allocationKind] = useWatch({ control, name: ["headId", "amount", "gstRatePct", "payeeKind", "allocationKind"] });
  const head = heads.find((candidate) => candidate.id === headId);
  const figures = { amount: Number(amount) || 0, gstRatePct: Number(gstRatePct) || 0 };

  const pickHead = (id: string) => {
    const picked = heads.find((candidate) => candidate.id === id);
    setValue("headId", id, { shouldValidate: true });
    if (!picked) return;
    setValue("gstRatePct", String(picked.gst === "own-rate" ? (picked.gstRatePct ?? 0) : picked.gst === "none" ? 0 : 18));
    setValue("allocationKind", picked.allocation);
    setValue("targetId", "");
  };

  const onSubmit = handleSubmit(
    () => setResult({ tone: "success", text: "The expense checks out. Saving switches on when expenses are connected to the database." }),
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );
  const errorText = (message?: string) => message && <p className="text-xs font-semibold text-danger-strong">{message}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-4">
        <GlassCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New expense</CardTitle>
            <StatusChip tone="neutral">{suggestedNumber}</StatusChip>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label="Expense head"
                options={heads.filter((candidate) => !candidate.archived).map((candidate) => ({ value: candidate.id, label: candidate.name }))}
                value={headId || undefined}
                onValueChange={pickHead}
              />
              {errorText(errors.headId?.message)}
              {head?.notes && <p className="text-xs font-semibold text-muted">{head.notes}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>
          <TextField label="What it was for" placeholder="Truck to Thimphu, yard rent October" error={errors.description?.message} {...register("description")} />
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <TextField label="Amount before GST (₹)" inputMode="decimal" error={errors.amount?.message} {...register("amount")} />
            <Controller
              control={control}
              name="gstRatePct"
              render={({ field }) => (
                <SelectField
                  label="GST on the bill"
                  options={RATES.map((rate) => ({ value: String(rate), label: rate ? `${rate}%` : "No GST" }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={head?.gst === "none"}
                />
              )}
            />
            <TextField label="Payee's slip or bill number" error={errors.reference?.message} {...register("reference")} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-4">
          <CardTitle>Who was paid</CardTitle>
          <Controller
            control={control}
            name="payeeKind"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                <FilterChip selected={field.value === "vendor"} onClick={() => field.onChange("vendor")}>
                  A vendor on record
                </FilterChip>
                <FilterChip selected={field.value === "other"} onClick={() => field.onChange("other")}>
                  Someone else (cash slip)
                </FilterChip>
              </div>
            )}
          />
          <div className="grid gap-3.5 @xl:grid-cols-2">
            {payeeKind === "vendor" ? (
              <div className="flex flex-col gap-1.5">
                <Controller
                  control={control}
                  name="vendorId"
                  render={({ field }) => <SelectField label="Vendor" options={vendors} value={field.value || undefined} onValueChange={field.onChange} />}
                />
                {errorText(errors.vendorId?.message)}
              </div>
            ) : (
              <TextField label="Paid to" placeholder="Name on the slip" error={errors.payee?.message} {...register("payee")} />
            )}
            <Controller
              control={control}
              name="paidFrom"
              render={({ field }) => (
                <SelectField
                  label="Paid from"
                  options={[...accounts, { value: NOT_PAID, label: "Not paid yet: owed to the payee" }]}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-4">
          <CardTitle>Whose profit it reduces</CardTitle>
          <Controller
            control={control}
            name="allocationKind"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {ALLOCATIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={field.value === option.value}
                    onClick={() => {
                      field.onChange(option.value);
                      setValue("targetId", "");
                    }}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            )}
          />
          <p className="-mt-2 text-sm font-medium text-muted">{ALLOCATIONS.find((option) => option.value === allocationKind)?.hint}.</p>
          {allocationKind !== "overhead" && (
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="targetId"
                render={({ field }) => (
                  <SelectField
                    label={allocationKind === "item-cost" ? "Purchase (goods bill)" : allocationKind === "invoice" ? "Invoice" : "Shipment"}
                    options={targets.filter((target) => target.kind === allocationKind).map((target) => ({ value: target.id, label: target.label }))}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errorText(errors.targetId?.message)}
            </div>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <FilePicker label="Bill or slip" accept="application/pdf,image/*" file={file} onChange={setFile} hint="Kept with the expense once file storage is chosen." />
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" className="h-[50px] px-6">
              Save expense
            </Button>
            <Link href="/expenses" className={buttonClasses("neutral", "ml-auto h-[50px]")}>
              Back to expenses
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-4">
        <CardTitle>Amount</CardTitle>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <div className="flex justify-between">
            <dt>Before GST</dt>
            <dd className="tabular-nums">{formatRate(figures.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>GST {figures.gstRatePct}%</dt>
            <dd className="tabular-nums">{formatRate(expenseGst(figures))}</dd>
          </div>
          <div className="my-1 border-t border-line" />
          <div className="flex justify-between text-lg font-extrabold">
            <dt>Paid</dt>
            <dd className="tabular-nums">{formatRate(expenseTotal(figures))}</dd>
          </div>
        </dl>
        <p className="text-xs font-semibold text-muted">
          {figures.gstRatePct
            ? "GST on a proper tax invoice is claimed back as input credit, so only the amount before GST reduces profit."
            : "No GST: the whole amount reduces profit."}
        </p>
      </GlassCard>
    </form>
  );
}
