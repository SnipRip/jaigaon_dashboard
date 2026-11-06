"use client";

import clsx from "clsx";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { CancelDocument } from "@/components/ui/cancel-document";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { documentType } from "@/features/invoices/dispatch-documents";
import { KIND_OF } from "@/features/invoices/invoices-api";
import { formatDate, formatInr, formatPercent, formatQuantity } from "@/lib/format";
import type { DispatchDocumentKindView } from "@/types/invoice";
import type { ShipmentView } from "@/types/shipment";
import { ShipmentExpensesCard } from "./shipment-expenses-card";
import { ShipmentStageCard } from "./shipment-stage-card";
import { ShipmentStageChip } from "./shipment-stage-chip";
import { cancelShipment, STATUS_OF } from "./shipments-api";

/** Every paper an export invoice takes, in the order they happen. */
const PAPERS = Object.keys(KIND_OF) as DispatchDocumentKindView[];

// One truck: where it is, what is stopping it moving to the next stage, the
// papers on each of its invoices, its expenses and what it earned.
export function ShipmentDetail({ shipment, onChanged }: { shipment: ShipmentView; onChanged: (next: ShipmentView) => Promise<void> }) {
  const live = !shipment.cancelledAt;
  const profit = shipment.profit;
  const linked = (shipment.expenses ?? []).filter((expense) => !expense.invoice && !expense.cancelled);

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{shipment.number}</CardTitle>
            {live ? <ShipmentStageChip status={STATUS_OF[shipment.stage]} /> : <StatusChip tone="neutral">Cancelled</StatusChip>}
            <span className="ml-auto flex flex-wrap gap-2">
              {live && (
                <Link href={`/shipments/${shipment.id}/edit`} className={buttonClasses("outline")}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              )}
              <Link href="/shipments" className={buttonClasses("neutral")}>
                Back to shipments
              </Link>
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FactTile label="Buyer">
              {shipment.partyName}
              <span className="block text-xs font-semibold text-muted">to {shipment.destination}</span>
            </FactTile>
            <FactTile label="Vehicle">
              {shipment.vehicleNumber}
              <span className="block text-xs font-semibold text-muted">{shipment.transporterName ?? "Own truck"}</span>
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
          {shipment.notes && <p className="text-sm font-semibold text-ink-soft">{shipment.notes}</p>}
          {!live && (
            <p className="text-sm font-semibold text-muted">
              Cancelled {shipment.cancelledAt ? formatDate(shipment.cancelledAt.slice(0, 10)) : ""}: {shipment.cancelReason}. Its number stays cancelled; its invoices may go on
              another shipment.
            </p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Papers on each invoice</CardTitle>
          <GlassTable className="min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Document</th>
                {shipment.invoices.map((invoice) => (
                  <th key={invoice.id} scope="col" className="text-left">
                    <Link href={`/invoices/${invoice.id}`} className="text-brand hover:underline">
                      {invoice.number}
                    </Link>
                    <span className="block text-xs font-semibold text-muted">{formatInr(invoice.total)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-semibold">
              {PAPERS.map((kind) => {
                const type = documentType(KIND_OF[kind]);
                return (
                  <tr key={kind}>
                    <td className="font-semibold">
                      {type.name}
                      <span className="block text-xs font-semibold text-muted">{type.stage}</span>
                    </td>
                    {shipment.invoices.map((invoice) => {
                      const attached = invoice.documents.find((doc) => doc.kind === kind);
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
                );
              })}
            </tbody>
          </GlassTable>
          <p className="text-xs font-semibold text-muted">Attach papers on the invoice page; this table follows. No e-way bill is needed up to ₹50,000.</p>
        </GlassCard>

        <ShipmentExpensesCard shipment={shipment} onChanged={onChanged} />
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <ShipmentStageCard shipment={shipment} onChanged={onChanged} />

        {profit && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Actual profit</CardTitle>
            <dl className="flex flex-col gap-1.5 text-sm font-semibold">
              <Row label="Sales, before GST" value={formatInr(profit.sales)} />
              <Row label="Purchase cost (first in, first out)" value={`− ${formatInr(profit.cost)}`} />
              <Row label="Freight, agent and other expenses" value={`− ${formatInr(profit.expenses)}`} />
              <div className="my-1 border-t border-line" />
              <div className={clsx("flex justify-between text-lg font-semibold", profit.profit < 0 && "text-danger-strong")}>
                <dt>Profit</dt>
                <dd className="tabular-nums">{formatInr(profit.profit)}</dd>
              </div>
            </dl>
            <p className="text-xs font-semibold text-muted">Margin {formatPercent(profit.marginPct)}. Expenses count those on the shipment and on its invoices.</p>
          </GlassCard>
        )}

        {live && (
          <GlassCard className="flex flex-col gap-3">
            <CancelDocument
              noun="shipment"
              effect="Its number is cancelled and its invoices are free to go on another shipment."
              blocked={linked.length ? "Expenses are linked to this shipment. Take them off or cancel them first to cancel it." : undefined}
              onCancel={async (reason) => onChanged(await cancelShipment(shipment.id, reason))}
            />
          </GlassCard>
        )}
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
