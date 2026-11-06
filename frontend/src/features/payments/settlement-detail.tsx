"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { OpenDocumentView, SettlementView } from "@/types/settlement";
import { AllocationTable } from "./allocation-table";
import { applyAdvanceSchema, type ApplyAdvanceValues } from "./settlement-schema";
import { applyAdvance, applyOldestFirst, cancelSettlement, documentHref, modeText } from "./settlements-api";

interface SettlementDetailProps {
  settlement: SettlementView;
  /** The party's documents in this direction (open ones can take the advance). */
  documents: OpenDocumentView[];
  /** After a change: reload settlements and documents. */
  onChanged: () => Promise<void>;
}

const failure = (error: unknown) => (error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");

// One receipt or payment: what it was applied to, what it kept as an
// advance (which can be applied here to documents opened since), and cancel.
export function SettlementDetail({ settlement, documents, onChanged }: SettlementDetailProps) {
  const word = settlement.direction === "RECEIPT" ? "receipt" : "payment";
  const live = !settlement.cancelledAt;
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const byId = new Map(documents.map((document) => [`${document.kind}-${document.id}`, document]));

  const cancel = async () => {
    if (reason.trim().length < 2) {
      setNotice("Say why it is cancelled.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await cancelSettlement(settlement.id, reason.trim());
      await onChanged();
      setCancelling(false);
    } catch (error) {
      setNotice(failure(error));
    }
    setBusy(false);
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Applied to</CardTitle>
          {settlement.allocations.length === 0 ? (
            <p className="text-sm font-semibold text-muted">Nothing yet: the whole amount is an advance.</p>
          ) : (
            <GlassTable className="min-w-[520px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">{settlement.direction === "RECEIPT" ? "Invoice" : "Bill"}</th>
                  <th scope="col" className="text-left">Applied on</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Still open</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                {settlement.allocations.map((allocation, index) => {
                  const document = byId.get(`${allocation.kind}-${allocation.documentId}`);
                  return (
                    <tr key={index}>
                      <td className="text-left">
                        <Link href={documentHref({ kind: allocation.kind, id: allocation.documentId, partyId: settlement.partyId })} className="font-semibold hover:text-brand hover:underline">
                          {allocation.number}
                        </Link>
                      </td>
                      <td className="text-left">{formatDate(allocation.appliedAt.slice(0, 10))}</td>
                      <td>{formatInr(allocation.amount)}</td>
                      <td className="text-muted">{document ? formatInr(document.balance) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </GlassTable>
          )}
        </GlassCard>
        {live && settlement.unapplied > 0 && <ApplyAdvanceCard settlement={settlement} open={documents.filter((document) => document.balance > 0)} onChanged={onChanged} />}
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{settlement.number}</CardTitle>
          <StatusChip tone={live ? (settlement.direction === "RECEIPT" ? "success" : "brand") : "neutral"}>{live ? (settlement.direction === "RECEIPT" ? "Receipt" : "Payment") : "Cancelled"}</StatusChip>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <FactTile label="Amount">{formatInr(settlement.amount)}</FactTile>
          <FactTile label="Date">{formatDate(settlement.date)}</FactTile>
          {settlement.tds > 0 && <FactTile label="TDS">{formatInr(settlement.tds)}</FactTile>}
          <FactTile label="Applied">{formatInr(settlement.applied)}</FactTile>
          <FactTile label="Advance left">{formatInr(live ? settlement.unapplied : 0)}</FactTile>
        </dl>
        <p className="text-xs font-semibold text-muted">
          <Link href={`/payments/ledger/${settlement.partyId}`} className="text-brand hover:underline">
            {settlement.partyName}
          </Link>{" "}
          · {modeText(settlement.mode)} · {settlement.accountName}
          {settlement.reference && ` · ${settlement.reference}`}
        </p>
        {settlement.brc && (
          <p className="text-xs font-semibold text-success-strong">
            BRC {settlement.brc.number} dated {formatDate(settlement.brc.date)}
          </p>
        )}
        {settlement.notes && <p className="text-sm text-ink-soft">{settlement.notes}</p>}
        {!live && (
          <p className="text-sm font-semibold text-danger-strong">
            Cancelled {settlement.cancelledAt ? formatDate(settlement.cancelledAt.slice(0, 10)) : ""}: {settlement.cancelReason}. It no longer settles anything and its number stays cancelled.
          </p>
        )}
        {live &&
          (cancelling ? (
            <div className="flex flex-col gap-2">
              <TextField label="Why it is cancelled" placeholder="Entered against the wrong party" value={reason} onChange={(event) => setReason(event.target.value)} />
              <div className="flex gap-2">
                <Button variant="danger" className="flex-1" disabled={busy} onClick={() => void cancel()}>
                  {busy ? "Cancelling…" : `Cancel ${word}`}
                </Button>
                <Button variant="neutral" disabled={busy} onClick={() => setCancelling(false)}>
                  Keep it
                </Button>
              </div>
              <p className="text-xs font-semibold text-muted">Its invoices or bills become open again. Enter it again if the money did move.</p>
            </div>
          ) : (
            <Button variant="neutral" onClick={() => setCancelling(true)}>
              Cancel this {word}
            </Button>
          ))}
        {notice && <FormMessage tone="error">{notice}</FormMessage>}
        <Link href="/payments" className={buttonClasses("neutral")}>
          Back to payments
        </Link>
      </GlassCard>
    </div>
  );
}

function ApplyAdvanceCard({ settlement, open, onChanged }: { settlement: SettlementView; open: OpenDocumentView[]; onChanged: () => Promise<void> }) {
  const today = useToday();
  const [problem, setProblem] = useState<string | null>(null);
  const rowsFrom = (plan?: Map<string, number>) =>
    open.map((document) => ({ kind: document.kind, documentId: document.id, balance: document.balance, amount: plan?.has(document.id) ? String(plan.get(document.id)) : "" }));
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyAdvanceValues>({ resolver: zodResolver(applyAdvanceSchema(settlement.unapplied)), defaultValues: { allocations: rowsFrom(), free: settlement.unapplied } });
  const rows = useFieldArray({ control, name: "allocations" });

  const submit = handleSubmit(async (values) => {
    setProblem(null);
    try {
      await applyAdvance(
        settlement.id,
        values.allocations.filter((row) => Number(row.amount) > 0).map((row) => ({ kind: row.kind, documentId: row.documentId, amount: Number(row.amount) })),
      );
      await onChanged();
    } catch (error) {
      setProblem(failure(error));
    }
  });

  return (
    <GlassCard className="flex flex-col gap-3">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Apply the advance of {formatInr(settlement.unapplied)}</CardTitle>
          <Button variant="outline" className="ml-auto" disabled={open.length === 0} onClick={() => rows.replace(rowsFrom(applyOldestFirst(settlement.unapplied, open)))}>
            Apply oldest first
          </Button>
        </div>
        {open.length === 0 ? (
          <p className="text-sm font-semibold text-muted">Nothing open with {settlement.partyName} yet. It is applied here once an {settlement.direction === "RECEIPT" ? "invoice" : "bill"} is made.</p>
        ) : (
          <AllocationTable documents={open} rowIds={rows.fields.map((field) => field.id)} register={register} errors={errors} today={today} documentWord={settlement.direction === "RECEIPT" ? "Invoice" : "Bill"} />
        )}
        {errors.free?.message && <FormMessage tone="error">{errors.free.message}</FormMessage>}
        {problem && <FormMessage tone="error">{problem}</FormMessage>}
        {open.length > 0 && (
          <Button type="submit" className="self-start" disabled={isSubmitting}>
            {isSubmitting ? "Applying…" : "Apply"}
          </Button>
        )}
      </form>
    </GlassCard>
  );
}
