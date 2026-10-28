"use client";

import clsx from "clsx";
import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import { msmeDaysLeft } from "@/features/payments/payment-rules";
import { daysBetween } from "@/lib/dates";
import { formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { AttentionItem, DatedAlert } from "./types";

const ITEM_CLASSES = "glass-inset flex flex-col gap-0.5 px-4 py-3";

/** MSME bills are flagged this many days before the 45-day limit. */
const MSME_WARN_DAYS = 7;

// Business alerts: overdue customers and MSME bills (judged against today,
// which only the browser knows), then missing documents, OCR reviews, stock.
export function AttentionList({ items, dated }: { items: AttentionItem[]; dated: DatedAlert[] }) {
  const today = useToday();
  const overdue = today ? dated.filter((alert) => alert.kind === "receivable" && alert.date < today) : [];
  const msme = today ? dated.filter((alert) => alert.kind === "msme" && msmeDaysLeft({ date: alert.date }, today) <= MSME_WARN_DAYS) : [];

  const timed: AttentionItem[] = [
    ...overdue
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((alert) => ({
        heading: `Payment · ${daysBetween(alert.date, today!)} days overdue`,
        detail: `${alert.party} · ${alert.document} · ${formatInr(alert.amount)}`,
        tone: "danger" as const,
        href: alert.href,
      })),
    ...msme.map((alert) => {
      const left = msmeDaysLeft({ date: alert.date }, today!);
      return {
        heading: left < 0 ? `MSME · ${-left} days past the 45-day limit` : `MSME · pay within ${left} days`,
        detail: `${alert.party} · ${alert.document} · ${formatInr(alert.amount)}`,
        tone: left < 0 ? ("danger" as const) : ("warning" as const),
        href: alert.href,
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
