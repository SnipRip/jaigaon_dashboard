"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { ApiError, apiGet } from "@/lib/api-client";
import { formatInr, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { OpenDocumentView, SettlementDirectionView, SettlementView } from "@/types/settlement";
import { AllocationTable } from "./allocation-table";
import { settlementSchema, type SettlementFormValues } from "./settlement-schema";
import { applyOldestFirst, CASH_RECEIPT_LIMIT, createSettlement, MODE_OPTIONS, numberPreviewPath } from "./settlements-api";

interface SettlementFormProps {
  direction: SettlementDirectionView;
  parties: SelectOption[];
  /** Every document of this direction; the open ones of the picked party are listed. */
  documents: OpenDocumentView[];
  accounts: BankCashAccountView[];
  /** Opened from an invoice's "Record receipt" or a bill's "Pay". */
  initialDocumentId?: string;
  /** After the save: reload what changed. */
  onSaved: (saved: SettlementView) => Promise<void>;
}

const TEXT = {
  RECEIPT: { title: "Record a receipt", party: "Received from", applied: "Apply to invoices", document: "Invoice", submit: "Save receipt", tds: "TDS deducted by the customer (₹)", account: "Into account" },
  PAYMENT: { title: "Pay a vendor", party: "Paid to", applied: "Apply to bills", document: "Bill", submit: "Save payment", tds: "TDS we deducted (₹)", account: "From account" },
};

// Money in from a customer or out to a vendor through a real bank or cash
// account, applied to the party's open invoices or bills (and opening
// balance), oldest first unless changed (Zoho's "auto-apply"). What is not
// applied stays as an advance and can be applied later from the entry page.
export function SettlementForm({ direction, parties, documents, accounts, initialDocumentId, onSaved }: SettlementFormProps) {
  const router = useRouter();
  const today = useToday();
  const text = TEXT[direction];
  const initial = documents.find((document) => document.id === initialDocumentId && document.balance > 0);
  const [problem, setProblem] = useState<string | null>(null);

  const openFor = (partyId: string) => documents.filter((document) => document.partyId === partyId && document.balance > 0);
  const rowsFor = (partyId: string, fill?: string) =>
    openFor(partyId).map((document) => ({ kind: document.kind, documentId: document.id, balance: document.balance, amount: document.id === fill ? String(document.balance) : "" }));
  const liveAccounts = accounts.filter((account) => !account.isArchived);
  const firstFor = (mode: string) => liveAccounts.find((account) => (mode === "CASH") === (account.kind === "CASH"))?.id ?? "";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      partyId: initial?.partyId ?? "",
      date: "",
      amount: initial ? String(initial.balance) : "",
      mode: "BANK_TRANSFER",
      accountId: firstFor("BANK_TRANSFER"),
      reference: "",
      tds: "",
      brcNumber: "",
      brcDate: "",
      notes: "",
      allocations: initial ? rowsFor(initial.partyId, initial.id) : [],
    },
  });
  const rows = useFieldArray({ control, name: "allocations" });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [partyId, date, amount, tds, mode, allocations] = useWatch({ control, name: ["partyId", "date", "amount", "tds", "mode", "allocations"] });
  const { data: nextNumber } = useSWR<{ number: string | null }>(date ? numberPreviewPath(direction, date) : null, apiGet);
  const accountOptions = useMemo(
    () => liveAccounts.filter((account) => (mode === "CASH") === (account.kind === "CASH")).map((account) => ({ value: account.id, label: account.name })),
    [liveAccounts, mode],
  );
  const applied = (allocations ?? []).reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0);
  const available = (Number(amount) || 0) + (Number(tds) || 0);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const exportApplied = (allocations ?? []).some((allocation) => Number(allocation.amount) > 0 && byId.get(allocation.documentId)?.flag === "EXPORT");

  const pickParty = (id: string) => {
    setValue("partyId", id, { shouldValidate: true });
    rows.replace(rowsFor(id));
  };
  const pickMode = (next: SettlementFormValues["mode"]) => {
    setValue("mode", next);
    const current = liveAccounts.find((account) => account.id === getValues("accountId"));
    if (!current || (next === "CASH") !== (current.kind === "CASH")) setValue("accountId", firstFor(next), { shouldValidate: true });
  };
  const fillOldestFirst = () => {
    const plan = applyOldestFirst(available, openFor(partyId));
    rows.replace(openFor(partyId).map((document) => ({ kind: document.kind, documentId: document.id, balance: document.balance, amount: plan.has(document.id) ? String(plan.get(document.id)) : "" })));
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setProblem(null);
      try {
        const saved = await createSettlement({
          direction,
          partyId: values.partyId,
          date: values.date,
          accountId: values.accountId,
          mode: values.mode,
          amount: Number(values.amount) || 0,
          tds: Number(values.tds) || 0,
          reference: values.reference || null,
          brcNumber: exportApplied && values.brcNumber ? values.brcNumber : null,
          brcDate: exportApplied && values.brcNumber ? values.brcDate : null,
          notes: values.notes || null,
          allocations: values.allocations
            .filter((row) => Number(row.amount) > 0)
            .map((row) => ({ kind: row.kind, documentId: row.documentId, amount: Number(row.amount) })),
        });
        await onSaved(saved);
        router.push(`/payments/entries/${saved.id}`);
      } catch (error) {
        setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setProblem("Some fields need attention. See the ones marked in red above."),
  );

  const openRows = rows.fields.map((field) => byId.get(field.documentId)!).filter(Boolean);

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{text.title}</CardTitle>
            <StatusChip tone="neutral">{nextNumber?.number ?? "Number on save"}</StatusChip>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField label={text.party} options={parties} value={partyId || undefined} onValueChange={pickParty} />
              {errors.partyId && <p className="text-xs font-semibold text-danger-strong">{errors.partyId.message}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <TextField label="Amount (₹)" inputMode="decimal" error={errors.amount?.message} {...register("amount")} />
            <SelectField label="How" options={MODE_OPTIONS} value={mode} onValueChange={(value) => pickMode(value as SettlementFormValues["mode"])} />
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
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <TextField label="Reference" placeholder="UTR, cheque or UPI number" error={errors.reference?.message} {...register("reference")} />
            <TextField label={text.tds} inputMode="decimal" hint="Counts towards settling the documents" error={errors.tds?.message} {...register("tds")} />
          </div>
          {direction === "RECEIPT" && mode === "CASH" && Number(amount) >= CASH_RECEIPT_LIMIT && (
            <p className="rounded-(--radius-tile) bg-danger-tint px-4 py-3 text-sm font-semibold text-danger-strong">
              Cash of ₹2 lakh or more from one person in a day is not allowed (Income-tax Act s.269ST). Take it by bank transfer or cheque.
            </p>
          )}
          {direction === "PAYMENT" && mode === "CASH" && Number(amount) > 10000 && (
            <p className="rounded-(--radius-tile) bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
              Cash over ₹10,000 to one person in a day is not allowed as a business expense (Income-tax Act s.40A(3)). Pay by bank if you can.
            </p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{text.applied}</CardTitle>
            <Button variant="outline" onClick={fillOldestFirst} disabled={!partyId || rows.fields.length === 0} className="ml-auto">
              Apply oldest first
            </Button>
          </div>
          {!partyId ? (
            <p className="text-sm font-semibold text-muted">Pick the party to see what is open.</p>
          ) : rows.fields.length === 0 ? (
            <p className="text-sm font-semibold text-muted">Nothing open. The whole amount is kept as an advance.</p>
          ) : (
            <AllocationTable documents={openRows} rowIds={rows.fields.map((field) => field.id)} register={register} errors={errors} today={today} documentWord={text.document} />
          )}
        </GlassCard>

        {direction === "RECEIPT" && exportApplied && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Bank realisation certificate</CardTitle>
            <p className="-mt-1.5 text-sm font-medium text-muted">
              Export proceeds: the BRC / e-BRC from the bank links this payment to the export invoice. Add it now (it is also attached to each export invoice that has none) or later on the invoice page.
            </p>
            <div className="grid gap-3.5 @xl:grid-cols-2">
              <TextField label="BRC / e-BRC number" error={errors.brcNumber?.message} {...register("brcNumber")} />
              <TextField label="BRC date" type="date" error={errors.brcDate?.message} {...register("brcDate")} />
            </div>
          </GlassCard>
        )}

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes" error={errors.notes?.message} {...register("notes")} />
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
          <Row label="Amount" value={formatRate(Number(amount) || 0)} />
          {Number(tds) > 0 && <Row label="TDS" value={formatRate(Number(tds))} />}
          <Row label="Applied" value={formatRate(applied)} />
          <div className="my-1 border-t border-line" />
          <div className={available - applied < 0 ? "flex justify-between font-semibold text-danger-strong" : "flex justify-between font-semibold"}>
            <dt>{available - applied < 0 ? "Applied more than received" : "Kept as advance"}</dt>
            <dd className="tabular-nums">{formatRate(Math.abs(available - applied))}</dd>
          </div>
        </dl>
        {partyId && (
          <p className="text-xs font-semibold text-muted">
            Open with this party: {formatInr(openFor(partyId).reduce((sum, document) => sum + document.balance, 0))}
          </p>
        )}
      </GlassCard>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
