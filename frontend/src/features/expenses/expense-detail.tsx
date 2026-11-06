"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { CancelDocument } from "@/components/ui/cancel-document";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { allocationLabel } from "@/features/masters/expense-heads-master";
import { TallyVoucher } from "@/features/loans/tally-voucher";
import { modeText } from "@/features/payments/settlements-api";
import { formatDate, formatRate } from "@/lib/format";
import type { ExpenseView } from "@/types/expense";
import { cancelExpense, FROM_BACKEND, targetHref } from "./expenses-api";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="text-right tabular-nums">{children}</dd>
  </div>
);

// One expense: what it was, who was paid and how, its GST, where the cost
// lands, the voucher it posts, and cancel (refused while vendor payments
// settle it).
export function ExpenseDetail({ expense, onChanged }: { expense: ExpenseView; onChanged: (next: ExpenseView) => Promise<void> }) {
  const live = !expense.cancelledAt;
  const onCredit = !expense.accountId;
  const split = expense.taxSplit === "INTER" ? `IGST ${expense.gstRatePct}%` : `CGST + SGST ${expense.gstRatePct}%`;

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{expense.number}</CardTitle>
            <StatusChip tone={live ? (onCredit && expense.balance > 0 ? "warning" : "brand") : "neutral"}>
              {live ? (onCredit ? (expense.balance > 0 ? "Owed" : "Paid later") : "Paid") : "Cancelled"}
            </StatusChip>
          </div>
          <dl className="flex flex-col gap-1.5 text-sm font-semibold">
            <Row label="Date">{formatDate(expense.date)}</Row>
            <Row label="Head">
              {expense.head.name} <span className="text-muted">({expense.head.tallyGroup})</span>
            </Row>
            <Row label="For">{expense.description}</Row>
            <Row label="Paid to">
              {expense.vendorId ? (
                <Link href={`/payments/ledger/${expense.vendorId}`} className="text-brand hover:underline">
                  {expense.payeeName}
                </Link>
              ) : (
                expense.payeeName
              )}
            </Row>
            {expense.reference && <Row label="Slip or bill number">{expense.reference}</Row>}
            {onCredit ? (
              <>
                <Row label="Due">{expense.dueDate ? formatDate(expense.dueDate) : "–"}</Row>
                <Row label="Settled by payments">{formatRate(expense.settled)}</Row>
                <Row label="Still owed">{formatRate(expense.balance)}</Row>
              </>
            ) : (
              <Row label="Paid from">
                {expense.accountName} · {expense.mode ? modeText(expense.mode) : ""}
              </Row>
            )}
            <Row label="Cost lands on">
              {expense.target ? (
                <Link href={targetHref(expense.target)} className="text-brand hover:underline">
                  {expense.target.number}
                </Link>
              ) : (
                allocationLabel(FROM_BACKEND[expense.allocation])
              )}
            </Row>
            {expense.allocation === "SHIPMENT" && <p className="text-xs text-muted">Linked to its shipment once shipments are stored.</p>}
            {expense.notes && <Row label="Notes">{expense.notes}</Row>}
          </dl>
          {!live && (
            <p className="text-sm font-semibold text-muted">
              Cancelled {expense.cancelledAt ? formatDate(expense.cancelledAt.slice(0, 10)) : ""}: {expense.cancelReason}. It posts nothing and its number stays cancelled.
            </p>
          )}
        </GlassCard>

        {expense.voucher && (
          <GlassCard className="flex flex-col gap-2.5">
            <CardTitle>In the books</CardTitle>
            <TallyVoucher voucher={{ type: expense.voucher.type, number: expense.number, date: expense.date, lines: expense.voucher.lines }} />
          </GlassCard>
        )}
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
        <CardTitle>Amount</CardTitle>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <Row label="Before GST">{formatRate(expense.amount)}</Row>
          {expense.tax > 0 && <Row label={split}>{formatRate(expense.tax)}</Row>}
          <div className="my-1 border-t border-line" />
          <Row label={onCredit ? "Owed" : "Paid"}>{formatRate(expense.total)}</Row>
          <Row label="Reduces profit by">{formatRate(expense.cost)}</Row>
        </dl>
        {expense.tax > 0 && (
          <p className="text-xs font-semibold text-muted">{expense.itcEligible ? "GST claimed back as input credit." : "Input credit blocked (17(5)): the GST is part of the cost."}</p>
        )}
        {live && onCredit && expense.balance > 0 && expense.vendorId && (
          <Link href={`/payments/vendor-payments/new?document=${expense.id}`} className={buttonClasses("primary")}>
            Pay the vendor
          </Link>
        )}
        {live && (
          <CancelDocument
            noun="expense"
            effect={expense.allocation === "ITEM_COST" ? "It stops posting, and the purchase's landed cost is worked out again without it." : "It stops posting; its number stays cancelled."}
            blocked={onCredit && expense.settled > 0 ? "Payments are applied to this expense. Cancel them first to cancel it." : undefined}
            onCancel={async (reason) => onChanged(await cancelExpense(expense.id, reason))}
          />
        )}
        <Link href="/expenses" className={buttonClasses("neutral")}>
          Back to expenses
        </Link>
      </GlassCard>
    </div>
  );
}
