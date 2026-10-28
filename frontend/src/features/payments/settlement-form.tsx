"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { formatDayMonth, formatInr, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { autoAllocate, CASH_RECEIPT_LIMIT, msmeDaysLeft, PAYMENT_MODES } from "./payment-rules";
import { settlementSchema, type SettlementFormValues } from "./settlement-schema";
import type { OpenDocument, Settlement } from "./types";

interface SettlementFormProps {
  direction: Settlement["direction"];
  parties: SelectOption[];
  documents: OpenDocument[];
  accounts: SelectOption[];
  suggestedNumber: string;
  /** Opened from an invoice's or bill's "Record receipt" / "Pay". */
  initialDocumentId?: string;
}

const TEXT = {
  in: { title: "Record a receipt", party: "Received from", applied: "Apply to invoices", submit: "Save receipt", back: "Back to payments", tds: "TDS deducted by the customer (₹)" },
  out: { title: "Pay a vendor", party: "Paid to", applied: "Apply to bills", submit: "Save payment", back: "Back to payments", tds: "TDS we deducted (₹)" },
};

// Money in from a customer or out to a vendor, applied to its open invoices
// or bills, oldest first unless changed (Zoho's "auto-apply"). Anything not
// applied stays as an advance against the party.
export function SettlementForm({ direction, parties, documents, accounts, suggestedNumber, initialDocumentId }: SettlementFormProps) {
  const today = useToday();
  const text = TEXT[direction];
  const initial = documents.find((document) => document.id === initialDocumentId);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const openFor = (partyId: string) => documents.filter((document) => document.partyId === partyId && document.balance > 0);
  const rowsFor = (partyId: string, fill?: string) =>
    openFor(partyId).map((document) => ({ documentId: document.id, balance: document.balance, amount: document.id === fill ? String(document.balance) : "" }));

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      partyId: initial?.partyId ?? "",
      date: "",
      amount: initial ? String(initial.balance) : "",
      mode: "bank-transfer",
      accountId: accounts[0]?.value ?? "",
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

  const [partyId, amount, tds, mode, allocations] = useWatch({ control, name: ["partyId", "amount", "tds", "mode", "allocations"] });
  const applied = (allocations ?? []).reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0);
  const available = (Number(amount) || 0) + (Number(tds) || 0);
  const exportApplied = (allocations ?? []).some((allocation) => Number(allocation.amount) > 0 && documents.find((document) => document.id === allocation.documentId)?.flag === "export");

  const pickParty = (id: string) => {
    setValue("partyId", id, { shouldValidate: true });
    rows.replace(rowsFor(id));
  };

  const applyOldestFirst = () => {
    const plan = autoAllocate(available, openFor(partyId));
    rows.replace(openFor(partyId).map((document) => ({ documentId: document.id, balance: document.balance, amount: String(plan.find((allocation) => allocation.documentId === document.id)?.amount ?? "") })));
  };

  const onSubmit = handleSubmit(
    () =>
      setResult({
        tone: "success",
        text: `The ${direction === "in" ? "receipt" : "payment"} checks out${available > applied ? `; ${formatInr(available - applied)} stays as an advance` : ""}. Saving switches on when payments are connected to the database.`,
      }),
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-4">
        <GlassCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{text.title}</CardTitle>
            <StatusChip tone="neutral">{suggestedNumber}</StatusChip>
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
            <Controller
              control={control}
              name="mode"
              render={({ field }) => <SelectField label="How" options={PAYMENT_MODES} value={field.value} onValueChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <SelectField label={direction === "in" ? "Into account" : "From account"} options={accounts} value={field.value || undefined} onValueChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <TextField label="Reference" placeholder="UTR, cheque or UPI number" error={errors.reference?.message} {...register("reference")} />
            <TextField label={text.tds} inputMode="decimal" hint="Counts towards settling the documents" error={errors.tds?.message} {...register("tds")} />
          </div>
          {direction === "in" && mode === "cash" && Number(amount) >= CASH_RECEIPT_LIMIT && (
            <p className="rounded-[18px] bg-danger-tint px-4 py-3 text-sm font-semibold text-danger-strong">
              Cash of ₹2 lakh or more from one person in a day is not allowed (Income-tax Act s.269ST). Take it by bank transfer or cheque.
            </p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{text.applied}</CardTitle>
            <Button variant="outline" onClick={applyOldestFirst} disabled={!partyId || rows.fields.length === 0} className="ml-auto">
              Apply oldest first
            </Button>
          </div>
          {!partyId ? (
            <p className="text-sm font-semibold text-muted">Pick the party to see what is open.</p>
          ) : rows.fields.length === 0 ? (
            <p className="text-sm font-semibold text-muted">Nothing open. The whole amount is kept as an advance.</p>
          ) : (
            <GlassTable className="min-w-[620px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">{direction === "in" ? "Invoice" : "Bill"}</th>
                  <th scope="col" className="text-left">Due</th>
                  <th scope="col">Balance</th>
                  <th scope="col" className="w-44">Apply</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                {rows.fields.map((field, index) => {
                  const document = documents.find((candidate) => candidate.id === field.documentId)!;
                  return (
                    <tr key={field.id} className="align-top">
                      <td className="text-left">
                        <Link href={document.href} className="font-bold hover:text-brand hover:underline">
                          {document.number}
                        </Link>
                        <div className="text-xs text-muted">
                          {formatDayMonth(document.date)}
                          {document.flag === "export" && " · export"}
                          {document.flag === "msme" && today && ` · MSME, ${Math.max(msmeDaysLeft(document, today), 0)} days left`}
                        </div>
                      </td>
                      <td className="text-left">{formatDayMonth(document.dueDate)}</td>
                      <td>{formatInr(document.balance)}</td>
                      <td>
                        <TextField
                          label={`Apply to ${document.number}`}
                          hideLabel
                          className="text-right"
                          inputMode="decimal"
                          error={errors.allocations?.[index]?.amount?.message}
                          {...register(`allocations.${index}.amount`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </GlassTable>
          )}
        </GlassCard>

        {direction === "in" && exportApplied && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Bank realisation certificate</CardTitle>
            <p className="-mt-1.5 text-sm font-medium text-muted">Export proceeds: the BRC / e-BRC from the bank links this payment to the export invoice. Add it now or when the bank issues it.</p>
            <div className="grid gap-3.5 @xl:grid-cols-2">
              <TextField label="BRC / e-BRC number" error={errors.brcNumber?.message} {...register("brcNumber")} />
              <TextField label="BRC date" type="date" error={errors.brcDate?.message} {...register("brcDate")} />
            </div>
          </GlassCard>
        )}

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant={direction === "in" ? "success" : "primary"} className="h-[50px] px-6">
              {text.submit}
            </Button>
            <Link href="/payments" className={buttonClasses("neutral", "ml-auto h-[50px]")}>
              {text.back}
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 xl:sticky xl:top-4">
        <CardTitle>Summary</CardTitle>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <Row label="Amount" value={formatRate(Number(amount) || 0)} />
          {Number(tds) > 0 && <Row label="TDS" value={formatRate(Number(tds))} />}
          <Row label="Applied" value={formatRate(applied)} />
          <div className="my-1 border-t border-line" />
          <div className={available - applied < 0 ? "flex justify-between font-extrabold text-danger-strong" : "flex justify-between font-extrabold"}>
            <dt>{available - applied < 0 ? "Applied more than received" : "Kept as advance"}</dt>
            <dd className="tabular-nums">{formatRate(Math.abs(available - applied))}</dd>
          </div>
        </dl>
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
