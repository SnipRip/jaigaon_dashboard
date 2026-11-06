"use client";

import clsx from "clsx";
import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import { documentHref } from "@/features/payments/settlements-api";
import { daysBetween } from "@/lib/dates";
import { formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { DashboardDueView } from "@/types/dashboard";
import type { AttentionItem } from "./types";

const ITEM_CLASSES = "glass-inset flex flex-col gap-0.5 px-4 py-3";

/** MSME bills are flagged this many days before their last day. */
const MSME_WARN_DAYS = 7;

// Business alerts: overdue customers and MSME bills (judged against today,
// which only the browser knows), then missing documents, stock.
export function AttentionList({ items, dues }: { items: AttentionItem[]; dues: DashboardDueView[] }) {
  const today = useToday();
  const daysLeft = (due: DashboardDueView) => daysBetween(today!, due.dueDate);
  const overdue = today ? dues.filter((due) => due.direction === "RECEIPT" && daysLeft(due) < 0) : [];
  const msme = today ? dues.filter((due) => due.direction === "PAYMENT" && daysLeft(due) <= MSME_WARN_DAYS) : [];
  const detail = (due: DashboardDueView) => `${due.partyName} · ${due.number} · ${formatInr(due.balance)}`;

  const timed: AttentionItem[] = [
    ...overdue
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((due) => ({
        heading: `Payment · ${-daysLeft(due)} days overdue`,
        detail: detail(due),
        tone: "danger" as const,
        href: documentHref(due),
      })),
    ...msme
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((due) => {
        const left = daysLeft(due);
        return {
          heading: left < 0 ? `MSME · ${-left} days past the 45-day limit` : `MSME · pay within ${left} days`,
          detail: detail(due),
          tone: left < 0 ? ("danger" as const) : ("warning" as const),
          href: documentHref(due),
        };
      }),
  ];

  return (
    <GlassCard className="flex flex-col gap-3">
      <CardTitle>Needs attention</CardTitle>
      {[...timed, ...items].map((item) => {
        const content = (
          <>
            <span className={clsx("text-xs font-semibold", STATUS_TEXT[item.tone])}>{item.heading}</span>
            <span className="text-[13px] font-semibold">{item.detail}</span>
          </>
        );
        return item.href ? (
          <Link key={`${item.heading}-${item.detail}`} href={item.href} className={clsx(ITEM_CLASSES, "glass-press hover:bg-white/70")}>
            {content}
          </Link>
        ) : (
          <div key={`${item.heading}-${item.detail}`} className={ITEM_CLASSES}>
            {content}
          </div>
        );
      })}
    </GlassCard>
  );
}
