"use client";

import { ArrowDownLeft, ArrowUpRight, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { ViewTabs } from "@/components/ui/view-tabs";
import { formatDayMonth, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { OpenDocumentView, SettlementView } from "@/types/settlement";
import { AGE_ORDER, AGE_TEXT, documentHref, modeText, msmeDaysLeft } from "./settlements-api";

type Tab = "receivable" | "payable" | "receipts" | "payments";

const TABS: { value: Tab; label: string }[] = [
  { value: "receivable", label: "Customers owe us" },
  { value: "payable", label: "We owe vendors" },
  { value: "receipts", label: "Receipts" },
  { value: "payments", label: "Payments made" },
];

interface PaymentsWorkspaceProps {
  /** Invoices and customers' opening balances, fully settled ones included. */
  receivable: OpenDocumentView[];
  /** Bills and vendors' opening balances. */
  payable: OpenDocumentView[];
  settlements: SettlementView[];
}

// What customers owe, what we owe vendors, and the money that moved. Ageing
// comes from the backend (on its date); MSME days left use today's date.
export function PaymentsWorkspace({ receivable, payable, settlements }: PaymentsWorkspaceProps) {
  const today = useToday();
  const [tab, setTab] = useState<Tab>("receivable");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const open = (documents: OpenDocumentView[]) =>
    documents.filter((document) => document.balance > 0 && (!needle || `${document.number} ${document.partyName}`.toLowerCase().includes(needle)));
  const matching = (direction: SettlementView["direction"]) =>
    settlements.filter(
      (settlement) =>
        settlement.direction === direction &&
        (!needle || `${settlement.number} ${settlement.partyName} ${settlement.reference ?? ""} ${settlement.allocations.map((allocation) => allocation.number).join(" ")}`.toLowerCase().includes(needle)),
    );

  const sum = (documents: OpenDocumentView[]) => documents.reduce((total, document) => total + document.balance, 0);
  const owed = receivable.filter((document) => document.balance > 0);
  const owing = payable.filter((document) => document.balance > 0);
  const overdue = owed.filter((document) => document.ageBucket !== "NOT_DUE");
  const msmeSoon = today ? owing.filter((document) => document.flag === "MSME" && msmeDaysLeft(document, today) <= 7) : [];
  const advances = settlements.filter((settlement) => !settlement.cancelledAt && !settlement.refund && settlement.unapplied > 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Customers owe us" value={formatInr(sum(owed))} />
        <StatTile label="Overdue from customers" value={formatInr(sum(overdue))} tone={overdue.length ? "danger" : undefined} />
        <StatTile label="We owe vendors" value={formatInr(sum(owing))} />
        <StatTile label="MSME due within 7 days" value={formatInr(sum(msmeSoon))} tone={msmeSoon.length ? "warning" : undefined} />
      </div>

      {msmeSoon.length > 0 && (
        <p role="status" className="rounded-(--radius-tile) bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
          MSME vendors must be paid within 45 days of the bill, or we owe interest and lose the tax deduction:{" "}
          {msmeSoon.map((document) => `${document.partyName} ${document.number} (${Math.max(msmeDaysLeft(document, today!), 0)} days left)`).join(", ")}.
        </p>
      )}
      {advances.length > 0 && (
        <p className="rounded-(--radius-tile) bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-strong">
          Kept as advances, not yet applied:{" "}
          {advances.map((settlement, index) => (
            <span key={settlement.id}>
              {index > 0 && ", "}
              <Link href={`/payments/entries/${settlement.id}`} className="underline">
                {settlement.number}
              </Link>{" "}
              {settlement.partyName} {formatInr(settlement.unapplied)}
            </span>
          ))}
          .
        </p>
      )}

      <GlassCard className="flex flex-col gap-3.5">
        <ViewTabs label="Payment views" tabs={TABS} value={tab} onChange={setTab} className="-mx-4 -mt-2 px-4 sm:-mx-[18px] sm:px-[18px]" />
        <ListToolbar
          actions={
            <>
              {advances.length > 0 && (
                <Link href="/payments/refunds/new" className={buttonClasses("neutral")}>
                  <Undo2 aria-hidden="true" />
                  Refund an advance
                </Link>
              )}
              <Link href="/payments/vendor-payments/new" className={buttonClasses("neutral")}>
                <ArrowUpRight aria-hidden="true" />
                Pay a vendor
              </Link>
              <Link href="/payments/receipts/new" className={buttonClasses("success", undefined, "lg")}>
                <ArrowDownLeft aria-hidden="true" />
                Record a receipt
              </Link>
            </>
          }
        >
          <SearchField className="max-w-[340px] flex-[1_1_240px]" id="payment-search" label="Search" value={query} onChange={setQuery} placeholder="Search by party, invoice, bill or reference" />
        </ListToolbar>

        {(tab === "receivable" || tab === "payable") && (
          <OpenTable documents={open(tab === "receivable" ? receivable : payable)} today={today} direction={tab === "receivable" ? "RECEIPT" : "PAYMENT"} />
        )}
        {(tab === "receipts" || tab === "payments") && <SettlementTable settlements={matching(tab === "receipts" ? "RECEIPT" : "PAYMENT")} />}
      </GlassCard>
    </div>
  );
}

function OpenTable({ documents, today, direction }: { documents: OpenDocumentView[]; today: string | null; direction: SettlementView["direction"] }) {
  const buckets = AGE_ORDER.map((bucket) => ({ bucket, total: documents.filter((document) => document.ageBucket === bucket).reduce((sum, document) => sum + document.balance, 0) }));
  return (
    <>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {buckets.map(({ bucket, total }) => (
          <div key={bucket} className="glass-inset rounded-(--radius-tile) px-3 py-2.5">
            <dt className="text-xs font-medium text-muted">{AGE_TEXT[bucket]}</dt>
            <dd className={total && bucket !== "NOT_DUE" ? "font-semibold text-danger-strong tabular-nums" : "font-semibold tabular-nums"}>{formatInr(total)}</dd>
          </div>
        ))}
      </dl>
      <GlassTable className="min-w-[860px]">
        <thead>
          <tr className="text-right">
            <th scope="col" className="text-left">{direction === "RECEIPT" ? "Invoice" : "Bill"}</th>
            <th scope="col" className="text-left">{direction === "RECEIPT" ? "Customer" : "Vendor"}</th>
            <th scope="col">Total</th>
            <th scope="col">{direction === "RECEIPT" ? "Received" : "Paid"}</th>
            <th scope="col">Balance</th>
            <th scope="col" className="text-left">Due</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-right font-semibold tabular-nums">
          {documents.map((document) => (
            <tr key={`${document.kind}-${document.id}`} className="align-top">
              <td className="text-left">
                <Link href={documentHref(document)} className="font-semibold hover:text-brand hover:underline">
                  {document.number}
                </Link>
                <div className="text-xs text-muted">{document.date ? formatDayMonth(document.date) : "Brought forward"}</div>
              </td>
              <td className="text-left">
                <Link href={`/payments/ledger/${document.partyId}`} className="font-semibold hover:text-brand hover:underline">
                  {document.partyName}
                </Link>
                {document.flag === "EXPORT" && <div className="text-xs text-muted">Export: BRC on receipt</div>}
                {document.flag === "MSME" && today && document.dueDate && (
                  <div className="text-xs text-warning-strong">MSME · {Math.max(msmeDaysLeft(document, today), 0)} days left of 45</div>
                )}
              </td>
              <td>{formatInr(document.total)}</td>
              <td className="text-muted">{formatInr(document.settled)}</td>
              <td className="font-semibold">{formatInr(document.balance)}</td>
              <td className="text-left">
                {document.dueDate ? formatDayMonth(document.dueDate) : "Due"}
                {document.ageBucket !== "NOT_DUE" && document.dueDate && (
                  <div>
                    <StatusChip tone="danger">{AGE_TEXT[document.ageBucket]} late</StatusChip>
                  </div>
                )}
              </td>
              <td>
                <Link
                  href={direction === "RECEIPT" ? `/payments/receipts/new?document=${document.id}` : `/payments/vendor-payments/new?document=${document.id}`}
                  className={buttonClasses("outline", "h-9 px-3.5 text-xs")}
                >
                  {direction === "RECEIPT" ? "Record receipt" : "Pay"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </GlassTable>
      {documents.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Nothing outstanding.</p>}
    </>
  );
}

function SettlementTable({ settlements }: { settlements: SettlementView[] }) {
  return (
    <>
      <GlassTable className="min-w-[860px]">
        <thead>
          <tr className="text-right">
            <th scope="col" className="text-left">Number</th>
            <th scope="col" className="text-left">Party</th>
            <th scope="col">Amount</th>
            <th scope="col" className="text-left">How</th>
            <th scope="col" className="text-left">Applied to</th>
          </tr>
        </thead>
        <tbody className="text-right font-semibold tabular-nums">
          {settlements.map((settlement) => (
            <tr key={settlement.id} className={settlement.cancelledAt ? "align-top text-muted" : "align-top"}>
              <td className="text-left">
                <Link href={`/payments/entries/${settlement.id}`} className="font-semibold hover:text-brand hover:underline">
                  {settlement.number}
                </Link>
                <div className="text-xs text-muted">{formatDayMonth(settlement.date)}</div>
                {settlement.cancelledAt ? <StatusChip tone="neutral">Cancelled</StatusChip> : settlement.refund && <StatusChip tone="warning">Refund</StatusChip>}
              </td>
              <td className="text-left">
                <Link href={`/payments/ledger/${settlement.partyId}`} className="font-semibold hover:text-brand hover:underline">
                  {settlement.partyName}
                </Link>
              </td>
              <td className={settlement.cancelledAt ? "line-through" : "font-semibold"}>
                {formatInr(settlement.amount)}
                {settlement.tds > 0 && <div className="text-xs text-muted">+ TDS {formatInr(settlement.tds)}</div>}
              </td>
              <td className="text-left">
                {modeText(settlement.mode)}
                <div className="text-xs text-muted">
                  {settlement.accountName}
                  {settlement.reference && ` · ${settlement.reference}`}
                </div>
              </td>
              <td className="text-left text-xs">
                {settlement.allocations.map((allocation, index) => (
                  <div key={index}>
                    {allocation.kind === "ADVANCE" && "Advance on "}
                    {allocation.number} · {formatInr(allocation.amount)}
                  </div>
                ))}
                {!settlement.cancelledAt && settlement.refunded > 0 && <div className="text-muted">Refunded {formatInr(settlement.refunded)}</div>}
                {!settlement.cancelledAt && settlement.unapplied > 0 && <div className="text-brand-strong">Advance {formatInr(settlement.unapplied)}</div>}
                {settlement.brc && <StatusChip tone="success">BRC {settlement.brc.number}</StatusChip>}
              </td>
            </tr>
          ))}
        </tbody>
      </GlassTable>
      {settlements.length === 0 && <p className="py-6 text-center text-[13px] text-muted">None yet.</p>}
    </>
  );
}
