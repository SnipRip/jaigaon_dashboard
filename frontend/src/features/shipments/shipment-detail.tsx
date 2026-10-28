"use client";

import clsx from "clsx";
import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { TextField } from "@/components/ui/text-field";
import type { Expense } from "@/features/expenses/types";
import { documentsFor, documentType } from "@/features/invoices/dispatch-documents";
import type { Invoice } from "@/features/invoices/types";
import type { Profit } from "@/features/profit/profit-rules";
import { formatDate, formatInr, formatPercent, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { missingFor, nextStage, SHIPMENT_STAGES, stageIndex, stageLabel } from "./shipment-rules";
import { ShipmentStageChip } from "./shipment-stage-chip";
import type { Shipment } from "./types";

interface ShipmentDetailProps {
  initialShipment: Shipment;
  invoices: Invoice[];
  customerName: string;
  transporterName?: string;
  expenses: Expense[];
  expenseHeadNames: Record<string, string>;
  profit: Profit;
}

// One truck: where it is, what is stopping it moving to the next stage, the
// papers on each of its invoices, its expenses and what it earned.
export function ShipmentDetail({ initialShipment, invoices, customerName, transporterName, expenses, expenseHeadNames, profit }: ShipmentDetailProps) {
  const today = useToday();
  const [shipment, setShipment] = useState(initialShipment);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const next = nextStage(shipment.status);
  const blockers = next ? missingFor(next, invoices) : [];
  const current = stageIndex(shipment.status);

  const advance = () => {
    if (!next || blockers.length) return;
    setShipment((value) => ({ ...value, status: next, events: [...value.events, { status: next, date: today ?? value.date, note: note || undefined }] }));
    setNote("");
    setNotice(`Moved to ${stageLabel(next)} on this page. It is not saved to the database yet.`);
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{shipment.number}</CardTitle>
            <ShipmentStageChip status={shipment.status} />
            <Link href="/shipments" className={buttonClasses("neutral", "ml-auto")}>
              Back to shipments
            </Link>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FactTile label="Buyer">
              {customerName}
              <span className="block text-xs font-semibold text-muted">to {shipment.destination}</span>
            </FactTile>
            <FactTile label="Vehicle">
              {shipment.vehicleNumber}
              <span className="block text-xs font-semibold text-muted">{transporterName ?? "Own truck"}</span>
            </FactTile>
            <FactTile label="Driver">
              {shipment.driverName ?? "–"}
              <span className="block text-xs font-semibold text-muted">{shipment.driverPhone ?? ""}</span>
            </FactTile>
            <FactTile label="Border">
              {shipment.borderPoint}
              <span className="block text-xs font-semibold text-muted">{shipment.customsAgent ?? "Agent not set"}</span>
            </FactTile>
            <FactTile label="Loading date">{formatDate(shipment.date)}</FactTile>
            <FactTile label="Seal">{shipment.sealNumber ?? "–"}</FactTile>
            <FactTile label="Packages">{shipment.packages ? formatQuantity(shipment.packages) : "–"}</FactTile>
            <FactTile label="Gross weight">{shipment.grossWeightKg ? `${formatQuantity(shipment.grossWeightKg)} kg` : "–"}</FactTile>
          </dl>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Papers on each invoice</CardTitle>
          <GlassTable className="min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Document</th>
                {invoices.map((invoice) => (
                  <th key={invoice.id} scope="col" className="text-left">
                    <Link href={`/invoices/${invoice.id}`} className="text-brand hover:underline">
                      {invoice.number}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-semibold">
              {documentsFor("export").map((type) => (
                <tr key={type.kind}>
                  <td className="font-semibold">
                    {type.name}
                    <span className="block text-xs font-semibold text-muted">{type.stage}</span>
                  </td>
                  {invoices.map((invoice) => {
                    const attached = invoice.documents[type.kind];
                    return (
                      <td key={invoice.id} className="text-xs">
                        {attached ? (
                          <span className="text-success-strong">
                            {attached.number.length > 20 ? `${attached.number.slice(0, 12)}…` : attached.number}
                            <span className="block text-muted">{formatDate(attached.date)}</span>
                          </span>
                        ) : (
                          <span className="text-muted">Not attached</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </GlassTable>
          <p className="text-xs font-semibold text-muted">Attach papers on the invoice page; this table follows.</p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Expenses on this shipment</CardTitle>
            <Link href="/expenses/new" className={buttonClasses("outline", "ml-auto")}>
              <Plus aria-hidden="true" className="size-[18px]" />
              Add an expense
            </Link>
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm font-semibold text-muted">No freight, agent or border charges booked yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {expenses.map((expense) => (
                <li key={expense.id} className="glass-inset flex flex-wrap justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
                  <span>
                    <span className="font-semibold">{expenseHeadNames[expense.headId]}</span>
                    <span className="font-semibold text-ink-soft"> · {expense.description}</span>
                    <span className="block text-xs font-semibold text-muted">
                      {expense.number} · {formatDate(expense.date)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatInr(expense.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Where it is</CardTitle>
          <ol className="flex flex-col">
            {SHIPMENT_STAGES.map((stage, index) => {
              const event = [...shipment.events].reverse().find((candidate) => candidate.status === stage.status);
              // The last stage, once reached, is finished rather than in progress.
              const finished = current === SHIPMENT_STAGES.length - 1;
              const done = index < current || (finished && index === current);
              const isCurrent = index === current && !finished;
              return (
                <li key={stage.status} className="relative flex gap-2.5 pb-3.5 last:pb-0">
                  {/* The line down to the next stage: green once this stage is passed. */}
                  {index < SHIPMENT_STAGES.length - 1 && (
                    <span aria-hidden="true" className={clsx("absolute top-5 bottom-0 left-[9px] w-0.5", done ? "bg-success" : "bg-ink/12")} />
                  )}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "relative flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      done && "border-success bg-success text-white",
                      isCurrent && "border-brand bg-white shadow-[0_0_0_3px_rgb(11_77_187/0.18)]",
                      !done && !isCurrent && "border-ink/20 bg-white",
                    )}
                  >
                    {done && <Check strokeWidth={3} className="size-3" />}
                    {isCurrent && <span className="size-2 rounded-full bg-brand" />}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className={clsx("text-[13px] leading-5", done || isCurrent ? "font-semibold" : "font-medium text-muted")}>
                      {stage.label}
                      {index === current && <span className="sr-only"> (current)</span>}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {event ? `${formatDate(event.date)}${event.note ? ` · ${event.note}` : ""}` : stage.hint}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {next && (
            <div className="flex flex-col gap-2.5 border-t border-line pt-3">
              {blockers.length > 0 ? (
                <p className="rounded-(--radius-tile) bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
                  Before {stageLabel(next).toLowerCase()}: attach{" "}
                  {blockers.map(({ invoice, kind }, index) => (
                    <span key={`${invoice.id}-${kind}`}>
                      {index > 0 && ", "}
                      <Link href={`/invoices/${invoice.id}`} className="font-semibold underline">
                        {documentType(kind).name}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              ) : (
                <TextField label="Note for this step (optional)" value={note} onChange={(event) => setNote(event.target.value)} placeholder="LEO number, who signed" />
              )}
              <Button variant="success" onClick={advance} disabled={blockers.length > 0}>
                Move to {stageLabel(next).toLowerCase()}
              </Button>
            </div>
          )}
          {notice && <FormMessage tone="success">{notice}</FormMessage>}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Actual profit</CardTitle>
          <dl className="flex flex-col gap-1.5 text-sm font-semibold">
            <Row label="Sales, before GST" value={formatInr(profit.sales)} />
            <Row label="Purchase cost" value={`− ${formatInr(profit.cost)}`} />
            <Row label="Freight, agent and other expenses" value={`− ${formatInr(profit.expenses)}`} />
            <div className="my-1 border-t border-line" />
            <div className={clsx("flex justify-between text-lg font-semibold", profit.profit < 0 && "text-danger-strong")}>
              <dt>Profit</dt>
              <dd className="tabular-nums">{formatInr(profit.profit)}</dd>
            </div>
          </dl>
          <p className="text-xs font-semibold text-muted">Margin {formatPercent(profit.marginPct)}. Cost is at item cost price until stock is valued at landed FIFO cost.</p>
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
