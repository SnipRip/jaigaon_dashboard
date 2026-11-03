"use client";

import clsx from "clsx";
import Link from "next/link";
import useSWR from "swr";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { daysBetween } from "@/lib/dates";
import { formatDate, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { LoanReminderView } from "@/types/loan";
import { LOAN_REMINDERS_PATH, loanHref, rowLabel } from "./loans-api";

const when = (days: number | null) => {
  if (days === null) return "Due soon";
  if (days < 0) return `Overdue by ${-days} ${days === -1 ? "day" : "days"}`;
  if (days === 0) return "Due today";
  return `Due in ${days} ${days === 1 ? "day" : "days"}`;
};

// EMIs, interest and repay-by dates that are overdue or within each loan's
// warning days: what we must pay, and what we must collect. Shown on the
// Dashboard and on Loans to whoever may see loans; for anyone else the
// backend answers 403 and the card stays hidden.
export function LoanRemindersCard({ className }: { className?: string }) {
  const { data, error } = useSWR<LoanReminderView[]>(LOAN_REMINDERS_PATH, apiGet);
  const today = useToday();
  if (error || !data) return null;

  const overdue = data.filter((reminder) => reminder.status === "OVERDUE").length;
  return (
    <GlassCard className={clsx("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>Loan dues</CardTitle>
        {overdue > 0 && <StatusChip tone="danger">{overdue} overdue</StatusChip>}
        <Link href="/loans" className="ml-auto text-xs font-semibold text-brand hover:underline">
          All loans
        </Link>
      </div>
      {data.length === 0 ? (
        <p className="text-sm font-semibold text-muted">Nothing to pay or collect is overdue or due in the next few days.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((reminder) => (
            <li key={`${reminder.loanId}-${reminder.instalmentNo}`}>
              <Link href={loanHref(reminder.loanId)} className="glass-inset flex flex-col gap-0.5 px-4 py-3 hover:bg-white/70">
                <span className={clsx("text-[13px] font-semibold", reminder.status === "OVERDUE" ? "text-danger-strong" : "text-warning-strong")}>
                  {reminder.direction === "TAKEN" ? "Pay" : "Collect"} {formatInr(reminder.amount)} · {when(today ? daysBetween(today, reminder.dueDate) : null)}
                </span>
                <span className="text-xs font-medium text-muted">
                  {reminder.loanName} · {rowLabel(reminder.direction, { kind: reminder.kind, no: reminder.instalmentNo })} on {formatDate(reminder.dueDate)} ·{" "}
                  {reminder.direction === "TAKEN" ? "from" : "into"} {reminder.repaymentAccountName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
