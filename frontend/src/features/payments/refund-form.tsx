"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { ApiError, apiGet } from "@/lib/api-client";
import { formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { SettlementDirectionView, SettlementView } from "@/types/settlement";
import { AllocationTable } from "./allocation-table";
import { refundSchema, type RefundFormValues } from "./refund-schema";
import { advanceDocument, CASH_RECEIPT_LIMIT, createSettlement, MODE_OPTIONS, numberPreviewPath, openAdvances, REFUND_DIRECTION } from "./settlements-api";

interface RefundFormProps {
  /** Every receipt and payment; the live ones still holding an advance are offered. */
  settlements: SettlementView[];
  accounts: BankCashAccountView[];
  /** Opened from an entry's "Refund the advance". */
  initialAdvanceId?: string;
  onSaved: (saved: SettlementView) => Promise<void>;
}

const TEXT = {
  RECEIPT: { chip: "Customer’s advance", party: "Refund to customer", account: "Paid from account", voucher: "Payment voucher", submit: "Save refund paid" },
  PAYMENT: { chip: "Our advance to a vendor", party: "Refund from vendor", account: "Received into account", voucher: "Receipt voucher", submit: "Save refund received" },
};

// Gives back what receipts or payments kept as advances, as Tally does it: a
// customer's unused advance goes back on a Payment voucher, a vendor's refund
// of ours comes in on a Receipt voucher, each against the advances it clears.
// One refund may clear several advances of the same party.
export function RefundForm({ settlements, accounts, initialAdvanceId, onSaved }: RefundFormProps) {
  const router = useRouter();
  const today = useToday();
  const [problem, setProblem] = useState<string | null>(null);
  const initial = settlements.find((settlement) => settlement.id === initialAdvanceId && !settlement.refund && !settlement.cancelledAt && settlement.unapplied > 0);
  const liveAccounts = accounts.filter((account) => !account.isArchived);
  const firstFor = (mode: string) => liveAccounts.find((account) => (mode === "CASH") === (account.kind === "CASH"))?.id ?? "";
  const rowsFor = (kept: SettlementDirectionView, partyId: string, fill?: string) =>
    openAdvances(settlements, kept, partyId).map((advance) => ({ kind: "ADVANCE" as const, documentId: advance.id, balance: advance.unapplied, amount: advance.id === fill ? String(advance.unapplied) : "" }));

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      kept: initial?.direction ?? "RECEIPT",
      partyId: initial?.partyId ?? "",
      date: "",
      mode: "BANK_TRANSFER",
      accountId: firstFor("BANK_TRANSFER"),
      reference: "",
      notes: "",
      allocations: initial ? rowsFor(initial.direction, initial.partyId, initial.id) : [],
    },
  });
  const rows = useFieldArray({ control, name: "allocations" });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [kept, partyId, date, mode, allocations] = useWatch({ control, name: ["kept", "partyId", "date", "mode", "allocations"] });
  const direction = REFUND_DIRECTION[kept];
  const text = TEXT[kept];
  const { data: nextNumber } = useSWR<{ number: string | null }>(date ? numberPreviewPath(direction, date) : null, apiGet);
  const advances = openAdvances(settlements, kept);
  const partyOptions = useMemo(() => [...new Map(advances.map((advance) => [advance.partyId, { value: advance.partyId, label: advance.partyName }])).values()], [advances]);
  const accountOptions = liveAccounts.filter((account) => (mode === "CASH") === (account.kind === "CASH")).map((account) => ({ value: account.id, label: account.name }));
  const byId = new Map(settlements.map((settlement) => [settlement.id, settlement]));
  const total = (allocations ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const partyName = partyOptions.find((option) => option.value === partyId)?.label ?? "the party";
  const accountName = accountOptions.find((option) => option.value === getValues("accountId"))?.label ?? "the account";

  const pickKept = (next: SettlementDirectionView) => {
    setValue("kept", next);
    setValue("partyId", "");
    rows.replace([]);
  };
  const pickParty = (id: string) => {
    setValue("partyId", id);
    rows.replace(rowsFor(kept, id));
  };
  const pickMode = (next: RefundFormValues["mode"]) => {
    setValue("mode", next);
    const current = liveAccounts.find((account) => account.id === getValues("accountId"));
    if (!current || (next === "CASH") !== (current.kind === "CASH")) setValue("accountId", firstFor(next), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setProblem(null);
      const chosen = values.allocations.filter((row) => Number(row.amount) > 0).map((row) => ({ kind: row.kind, documentId: row.documentId, amount: Number(row.amount) }));
      try {
        const saved = await createSettlement({
          direction: REFUND_DIRECTION[values.kept],
          partyId: values.partyId,
          date: values.date,
          accountId: values.accountId,
          mode: values.mode,
          amount: Math.round(chosen.reduce((sum, row) => sum + row.amount, 0) * 100) / 100,
          tds: 0,
          reference: values.reference || null,
          brcNumber: null,
          brcDate: null,
          notes: values.notes || null,
          allocations: chosen,
        });
        await onSaved(saved);
        router.push(`/payments/entries/${saved.id}`);
      } catch (error) {
        setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setProblem("Some fields need attention. See the ones marked in red above."),
  );

  const rowsProblem = errors.allocations?.message ?? errors.allocations?.root?.message;
  const openRows = rows.fields.map((field) => byId.get(field.documentId)).filter((row): row is SettlementView => Boolean(row)).map(advanceDocument);

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Refund an advance</CardTitle>
            <StatusChip tone="neutral">{nextNumber?.number ?? "Number on save"}</StatusChip>
          </div>
          <FilterGroup label="Whose advance">
            {(["RECEIPT", "PAYMENT"] as const).map((option) => (
              <FilterChip key={option} selected={kept === option} onClick={() => pickKept(option)}>
                {TEXT[option].chip}
              </FilterChip>
            ))}
          </FilterGroup>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField label={text.party} options={partyOptions} value={partyId || undefined} onValueChange={pickParty} />
              {partyOptions.length === 0 && <p className="text-xs font-semibold text-muted">No {kept === "RECEIPT" ? "customer" : "vendor"} has an advance left.</p>}
              {errors.partyId && <p className="text-xs font-semibold text-danger-strong">{errors.partyId.message}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <SelectField label="How" options={MODE_OPTIONS} value={mode} onValueChange={(value) => pickMode(value as RefundFormValues["mode"])} />
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <SelectField label={text.account} options={accountOptions} value={field.value || undefined} onValueChange={field.onChange} />
                  {(errors.accountId || accountOptions.length === 0) && (
                    <p className="text-xs font-semibold text-danger-strong">
                      {accountOptions.length === 0 ? (
                        <>
                          No {mode === "CASH" ? "cash book" : "bank account"} yet.{" "}
                          <Link href="/masters/bank-cash" className="underline">
                            Add one in Bank &amp; cash
                          </Link>
                        </>
                      ) : (
                        errors.accountId?.message
                      )}
                    </p>
                  )}
                </div>
              )}
            />
            <TextField label="Reference" placeholder="UTR, cheque or UPI number" error={errors.reference?.message} {...register("reference")} />
          </div>
          {direction === "RECEIPT" && mode === "CASH" && total >= CASH_RECEIPT_LIMIT && (
            <p className="rounded-(--radius-tile) bg-danger-tint px-4 py-3 text-sm font-semibold text-danger-strong">
              Cash of ₹2 lakh or more from one person in a day is not allowed (Income-tax Act s.269ST). Take it by bank transfer or cheque.
            </p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Advances refunded</CardTitle>
            <Button
              variant="outline"
              className="ml-auto"
              disabled={rows.fields.length === 0}
              onClick={() => rows.replace(rows.fields.map((field) => ({ kind: field.kind, documentId: field.documentId, balance: field.balance, amount: String(field.balance) })))}
            >
              Refund all
            </Button>
          </div>
          {!partyId ? (
            <p className="text-sm font-semibold text-muted">Pick the party to see the advances it holds.</p>
          ) : (
            <AllocationTable documents={openRows} rowIds={rows.fields.map((field) => field.id)} register={register} errors={errors} today={today} documentWord={kept === "RECEIPT" ? "Receipt" : "Payment"} applyWord="Refund" />
          )}
          {rowsProblem && <FormMessage tone="error">{rowsProblem}</FormMessage>}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes" placeholder="Order cancelled; balance returned" error={errors.notes?.message} {...register("notes")} />
          {problem && <FormMessage tone="error">{problem}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant={direction === "RECEIPT" ? "success" : "primary"} size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : text.submit}
            </Button>
            <Link href="/payments" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to payments
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 xl:sticky xl:top-3.5">
        <CardTitle>Summary</CardTitle>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <div className="flex justify-between">
            <dt>{direction === "PAYMENT" ? "Refund paid" : "Refund received"}</dt>
            <dd className="tabular-nums">{formatRate(total)}</dd>
          </div>
        </dl>
        <p className="text-xs font-semibold text-muted">
          {text.voucher}:{" "}
          {direction === "PAYMENT" ? `Dr ${partyName}, Cr ${accountName}` : `Dr ${accountName}, Cr ${partyName}`}. Advances for goods carry no GST, so nothing is reversed.
        </p>
      </GlassCard>
    </form>
  );
}
