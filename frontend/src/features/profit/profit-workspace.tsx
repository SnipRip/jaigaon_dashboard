"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatTile } from "@/components/ui/stat-tile";
import { ViewTabs } from "@/components/ui/view-tabs";
import { formatInr, formatPercent } from "@/lib/format";
import type { ProfitRow } from "./profit-report";
import type { Profit } from "./profit-rules";

type View = "invoice" | "shipment" | "customer" | "item";

const VIEWS: { value: View; label: string; first: string }[] = [
  { value: "invoice", label: "By invoice", first: "Invoice" },
  { value: "shipment", label: "By shipment", first: "Shipment" },
  { value: "customer", label: "By customer", first: "Customer" },
  { value: "item", label: "By item", first: "Item" },
];

type SortKey = "profit" | "marginPct" | "sales";

interface ProfitWorkspaceProps {
  rows: Record<View, ProfitRow[]>;
  total: Profit;
  overheads: number;
}

// Actual profit (SOW 15): sales value less purchase cost less the expenses
// allocated to each sale, all before GST. Overheads come off once, at the end.
export function ProfitWorkspace({ rows, total, overheads }: ProfitWorkspaceProps) {
  const [view, setView] = useState<View>("invoice");
  const [sort, setSort] = useState<SortKey>("profit");
  const visible = [...rows[view]].sort((a, b) => b[sort] - a[sort]);
  const widest = Math.max(...visible.map((row) => Math.abs(row.profit)), 1);
  const net = total.profit - overheads;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Sales, before GST" value={formatInr(total.sales)} />
        <StatTile label="Profit on sales" value={formatInr(total.profit)} tone="success" />
        <StatTile label="Overheads" value={formatInr(overheads)} />
        <StatTile label="Net profit" value={formatInr(net)} tone={net < 0 ? "danger" : "success"} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <ViewTabs label="Group profit by" tabs={VIEWS} value={view} onChange={setView} className="-mx-4 -mt-1 px-4 sm:-mx-[18px] sm:px-[18px]" />
        <GlassTable className="min-w-[880px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">{VIEWS.find((option) => option.value === view)?.first}</th>
              <SortHeader label="Sales" active={sort === "sales"} onClick={() => setSort("sales")} />
              <th scope="col">Purchase cost</th>
              <th scope="col">Expenses</th>
              <SortHeader label="Profit" active={sort === "profit"} onClick={() => setSort("profit")} />
              <SortHeader label="Margin" active={sort === "marginPct"} onClick={() => setSort("marginPct")} />
              <th scope="col" className="w-40">
                <span className="sr-only">Profit bar</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((row) => (
              <tr key={row.key}>
                <td className="text-left">
                  {row.href ? (
                    <Link href={row.href} className="font-semibold hover:text-brand hover:underline">
                      {row.label}
                    </Link>
                  ) : (
                    <span className="font-semibold">{row.label}</span>
                  )}
                  {row.detail && <div className="text-xs text-muted">{row.detail}</div>}
                </td>
                <td>{formatInr(row.sales)}</td>
                <td className="text-muted">{formatInr(row.cost)}</td>
                <td className="text-muted">{formatInr(row.expenses)}</td>
                <td className={clsx("font-semibold", row.profit < 0 && "text-danger-strong")}>{formatInr(row.profit)}</td>
                <td className={row.marginPct < 8 ? "text-danger-strong" : undefined}>{formatPercent(row.marginPct)}</td>
                <td>
                  <span aria-hidden="true" className="block h-2.5 rounded-full bg-ink/5">
                    <span
                      className={clsx("block h-full rounded-full", row.profit < 0 ? "bg-danger" : "bg-success")}
                      style={{ width: `${(Math.abs(row.profit) / widest) * 100}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-right font-semibold tabular-nums">
            <tr className="border-t border-line">
              <td className="text-left">Total</td>
              <td>{formatInr(total.sales)}</td>
              <td>{formatInr(total.cost)}</td>
              <td>{formatInr(total.expenses)}</td>
              <td>{formatInr(total.profit)}</td>
              <td>{formatPercent(total.marginPct)}</td>
              <td />
            </tr>
          </tfoot>
        </GlassTable>
      </GlassCard>

      <GlassCard className="flex flex-col gap-2">
        <CardTitle>How this is worked out</CardTitle>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm font-medium text-ink-soft">
          <li>Sales are the invoice value before GST; GST never counts as income or cost.</li>
          <li>Purchase cost is each item&rsquo;s cost price today. Once stock moves are recorded it becomes the landed FIFO cost, with freight and labour from Purchases.</li>
          <li>Expenses booked on a shipment are shared over its invoices by value; those on an invoice over its items the same way.</li>
          <li>Rent, salary and other overheads come off once, as net profit. Only issued invoices count.</li>
        </ul>
      </GlassCard>
    </div>
  );
}

function SortHeader({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th scope="col" aria-sort={active ? "descending" : "none"}>
      <button type="button" onClick={onClick} className={clsx("font-semibold hover:text-brand", active && "text-brand-strong underline")}>
        {label}
      </button>
    </th>
  );
}
