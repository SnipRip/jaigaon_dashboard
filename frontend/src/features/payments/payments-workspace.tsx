"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDayMonth, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { AGE_BUCKETS, ageBucket, modeLabel, msmeDaysLeft } from "./payment-rules";
import type { OpenDocument, Settlement } from "./types";

type Tab = "receivable" | "payable" | "receipts" | "payments";

const TABS: { value: Tab; label: string }[] = [
  { value: "receivable", label: "Customers owe us" },
  { value: "payable", label: "We owe vendors" },
  { value: "receipts", label: "Receipts" },
  { value: "payments", label: "Payments made" },
];

interface PaymentsWorkspaceProps {
  receivable: OpenDocument[];
  payable: OpenDocument[];
  receipts: Settlement[];
  payments: Settlement[];
  /** Party and account id → name. */
  names: Record<string, string>;
  /** Document id → number, for allocations. */
  documentNumbers: Record<string, string>;
}

// What customers owe, what we owe vendors, and the money that moved. Ageing
// needs today's date, which only the browser knows.
export function PaymentsWorkspace({ receivable, payable, receipts, payments, names, documentNumbers }: PaymentsWorkspaceProps) {
  const today = useToday();
  const [tab, setTab] = useState<Tab>("receivable");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const open = (documents: OpenDocument[]) =>
    documents.filter((document) => document.balance > 0 && (!needle || `${document.number} ${names[document.partyId]}`.toLowerCase().includes(needle)));
  const matching = (settlements: Settlement[]) =>
    settlements.filter((settlement) => !needle || `${settlement.number} ${names[settlement.partyId]} ${settlement.reference ?? ""}`.toLowerCase().includes(needle));

  const sum = (documents: OpenDocument[]) => documents.reduce((total, document) => total + document.balance, 0);
  const overdue = today ? receivable.filter((document) => document.balance > 0 && document.dueDate < today) : [];
  const msmeSoon = today ? payable.filter((document) => document.flag === "msme" && document.balance > 0 && msmeDaysLeft(document, today) <= 7) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Customers owe us" value={formatInr(sum(receivable))} />
        <StatTile label="Overdue from customers" value={formatInr(sum(overdue))} tone={overdue.length ? "danger" : undefined} />
        <StatTile label="We owe vendors" value={formatInr(sum(payable))} />
        <StatTile label="MSME due within 7 days" value={formatInr(sum(msmeSoon))} tone={msmeSoon.length ? "warning" : undefined} />
      </div>

      {msmeSoon.length > 0 && (
        <p role="status" className="rounded-[18px] bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
          MSME vendors must be paid within 45 days of the bill, or we owe interest and lose the tax deduction:{" "}
          {msmeSoon.map((document) => `${names[document.partyId]} (${Math.max(msmeDaysLeft(document, today!), 0)} days left)`).join(", ")}.
        </p>
      )}

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Link href="/payments/receipts/new" className={buttonClasses("success")}>
            <ArrowDownLeft aria-hidden="true" className="size-[18px]" />
            Record a receipt
          </Link>
          <Link href="/payments/vendor-payments/new" className={buttonClasses("primary")}>
            <ArrowUpRight aria-hidden="true" className="size-[18px]" />
            Pay a vendor
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.map((option) => (
            <FilterChip key={option.value} selected={tab === option.value} onClick={() => setTab(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
        <SearchField id="payment-search" label="Search" value={query} onChange={setQuery} placeholder="Search by party, invoice, bill or reference" />

        {(tab === "receivable" || tab === "payable") && (
          <OpenTable documents={open(tab === "receivable" ? receivable : payable)} names={names} today={today} direction={tab === "receivable" ? "in" : "out"} />
        )}
        {(tab === "receipts" || tab === "payments") && (
          <SettlementTable settlements={matching(tab === "receipts" ? receipts : payments)} names={names} documentNumbers={documentNumbers} />
        )}
      </GlassCard>
    </div>
  );
}

function OpenTable({ documents, names, today, direction }: { documents: OpenDocument[]; names: Record<string, string>; today: string | null; direction: "in" | "out" }) {
  const buckets = today ? AGE_BUCKETS.map((bucket) => ({ bucket, total: documents.filter((document) => ageBucket(document.dueDate, today) === bucket).reduce((sum, document) => sum + document.balance, 0) })) : [];
  return (
    <>
      {buckets.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {buckets.map(({ bucket, total }) => (
            <div key={bucket} className="glass-inset rounded-[18px] px-3 py-2.5">
              <dt className="text-xs font-bold text-muted">{bucket}</dt>
              <dd className={total && bucket !== "Not due" ? "font-extrabold text-danger-strong tabular-nums" : "font-extrabold tabular-nums"}>{formatInr(total)}</dd>
            </div>
          ))}
        </dl>
      )}
      <GlassTable className="min-w-[860px]">
        <thead>
          <tr className="text-right">
            <th scope="col" className="text-left">{direction === "in" ? "Invoice" : "Bill"}</th>
            <th scope="col" className="text-left">{direction === "in" ? "Customer" : "Vendor"}</th>
            <th scope="col">Total</th>
            <th scope="col">{direction === "in" ? "Received" : "Paid"}</th>
            <th scope="col">Balance</th>
            <th scope="col" className="text-left">Due</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-right font-semibold tabular-nums">
          {documents.map((document) => {
            const late = today ? ageBucket(document.dueDate, today) : undefined;
            return (
              <tr key={document.id} className="align-top">
                <td className="text-left">
                  <Link href={document.href} className="font-bold hover:text-brand hover:underline">
                    {document.number}
                  </Link>
                  <div className="text-xs text-muted">{formatDayMonth(document.date)}</div>
                </td>
                <td className="text-left">
                  <Link href={`/payments/ledger/${document.partyId}`} className="font-bold hover:text-brand hover:underline">
                    {names[document.partyId]}
                  </Link>
                  {document.flag === "export" && <div className="text-xs text-muted">Export: BRC on receipt</div>}
                  {document.flag === "msme" && today && <div className="text-xs text-warning-strong">MSME · {Math.max(msmeDaysLeft(document, today), 0)} of 45 days left</div>}
                </td>
                <td>{formatInr(document.total)}</td>
                <td className="text-muted">{formatInr(document.settled)}</td>
                <td className="font-bold">{formatInr(document.balance)}</td>
                <td className="text-left">
                  {formatDayMonth(document.dueDate)}
                  {late && late !== "Not due" && (
                    <div>
                      <StatusChip tone="danger">{late} late</StatusChip>
                    </div>
                  )}
                </td>
                <td>
                  <Link
                    href={direction === "in" ? `/payments/receipts/new?invoice=${document.id}` : `/payments/vendor-payments/new?bill=${document.id}`}
                    className={buttonClasses("outline", "h-9 px-3.5 text-xs")}
                  >
                    {direction === "in" ? "Record receipt" : "Pay"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </GlassTable>
      {documents.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">Nothing outstanding.</p>}
    </>
  );
}

function SettlementTable({ settlements, names, documentNumbers }: { settlements: Settlement[]; names: Record<string, string>; documentNumbers: Record<string, string> }) {
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
          {[...settlements].sort((a, b) => b.date.localeCompare(a.date)).map((settlement) => (
            <tr key={settlement.id} className="align-top">
              <td className="text-left">
                <span className="font-bold">{settlement.number}</span>
                <div className="text-xs text-muted">{formatDayMonth(settlement.date)}</div>
              </td>
              <td className="text-left">
                <Link href={`/payments/ledger/${settlement.partyId}`} className="font-bold hover:text-brand hover:underline">
                  {names[settlement.partyId]}
                </Link>
              </td>
              <td className="font-bold">{formatInr(settlement.amount)}</td>
              <td className="text-left">
                {modeLabel(settlement.mode)}
                <div className="text-xs text-muted">
                  {names[settlement.accountId]}
                  {settlement.reference && ` · ${settlement.reference}`}
                </div>
              </td>
              <td className="text-left text-xs">
                {settlement.allocations.map((allocation) => (
                  <div key={allocation.documentId}>
                    {documentNumbers[allocation.documentId]} · {formatInr(allocation.amount)}
                  </div>
                ))}
                {settlement.brc && <StatusChip tone="success">BRC {settlement.brc.number}</StatusChip>}
              </td>
            </tr>
          ))}
        </tbody>
      </GlassTable>
      {settlements.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">None yet.</p>}
    </>
  );
}
