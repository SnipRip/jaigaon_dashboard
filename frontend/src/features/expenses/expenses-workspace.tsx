"use client";

import { Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { ALLOCATIONS, allocationLabel } from "@/features/masters/expense-heads-master";
import type { HeadAllocation } from "@/features/masters/types";
import { formatDayMonth, formatInr } from "@/lib/format";
import type { ExpenseView } from "@/types/expense";
import { FROM_BACKEND, targetHref } from "./expenses-api";

const money = (value: number) => Math.round(value * 100) / 100;
const sumCost = (expenses: ExpenseView[]) => money(expenses.reduce((sum, expense) => sum + expense.cost, 0));

// Every expense with where its cost lands: on a purchase's items (landed
// cost), one invoice, one shipment, or general overhead. Cancelled ones are
// struck through and count nowhere.
export function ExpensesWorkspace({ expenses }: { expenses: ExpenseView[] }) {
  const [filter, setFilter] = useState<HeadAllocation | "owed" | "all">("all");
  const [query, setQuery] = useState("");
  const live = expenses.filter((expense) => !expense.cancelledAt);
  const needle = query.trim().toLowerCase();
  const visible = expenses.filter(
    (expense) =>
      (filter === "all" || (filter === "owed" ? !expense.cancelledAt && expense.balance > 0 : FROM_BACKEND[expense.allocation] === filter)) &&
      (!needle || `${expense.number} ${expense.head.name} ${expense.description} ${expense.payeeName} ${expense.reference ?? ""} ${expense.target?.number ?? ""}`.toLowerCase().includes(needle)),
  );
  const byKind = (kind: HeadAllocation) => sumCost(live.filter((expense) => FROM_BACKEND[expense.allocation] === kind));
  const owed = money(live.reduce((sum, expense) => sum + expense.balance, 0));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Cost, before claimable GST" value={formatInr(sumCost(live))} />
        <StatTile label="Landed on items" value={formatInr(byKind("item-cost"))} />
        <StatTile label="On invoices and shipments" value={formatInr(byKind("invoice") + byKind("shipment"))} />
        <StatTile label="Still owed to vendors" value={formatInr(owed)} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <>
              <Link href="/masters/expense-heads" className={buttonClasses("neutral")}>
                <Settings2 aria-hidden="true" />
                Expense heads
              </Link>
              <Link href="/expenses/new" className={buttonClasses("primary", undefined, "lg")}>
                <Plus aria-hidden="true" />
                New expense
              </Link>
            </>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="expense-search"
            label="Search expenses"
            value={query}
            onChange={setQuery}
            placeholder="Search by number, head, payee or slip number"
            trailing={`${visible.length} of ${expenses.length}`}
          />
          <FilterGroup label="Where the cost lands">
            <FilterChip selected={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            {ALLOCATIONS.map((option) => (
              <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
              </FilterChip>
            ))}
            <FilterChip selected={filter === "owed"} onClick={() => setFilter("owed")}>
              Owed
            </FilterChip>
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[960px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Expense</th>
              <th scope="col" className="text-left">Head</th>
              <th scope="col" className="text-left">Paid to</th>
              <th scope="col">Amount</th>
              <th scope="col">GST</th>
              <th scope="col" className="text-left">Cost lands on</th>
              <th scope="col" className="text-left">Paid from</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((expense) => (
              <tr key={expense.id} className={expense.cancelledAt ? "align-top text-muted line-through" : "align-top"}>
                <td className="text-left">
                  <Link href={`/expenses/${expense.id}`} className="font-semibold text-brand hover:underline">
                    {expense.number}
                  </Link>
                  <div className="text-xs text-muted">
                    {formatDayMonth(expense.date)}
                    {expense.reference && ` · ${expense.reference}`}
                  </div>
                </td>
                <td className="text-left">
                  <div className="font-semibold">{expense.head.name}</div>
                  <div className="text-xs text-muted">{expense.description}</div>
                </td>
                <td className="text-left">{expense.payeeName}</td>
                <td>{formatInr(expense.amount)}</td>
                <td className="text-muted">{expense.tax ? formatInr(expense.tax) : "–"}</td>
                <td className="text-left">
                  {expense.target ? (
                    <Link href={targetHref(expense.target)} className="font-semibold text-brand hover:underline">
                      {expense.target.number}
                    </Link>
                  ) : (
                    <StatusChip tone="neutral">{allocationLabel(FROM_BACKEND[expense.allocation])}</StatusChip>
                  )}
                </td>
                <td className="text-left">
                  {expense.cancelledAt ? (
                    "Cancelled"
                  ) : expense.accountName ? (
                    expense.accountName
                  ) : expense.balance > 0 ? (
                    <span className="text-warning-strong">Owed {formatInr(expense.balance)}</span>
                  ) : (
                    "Paid later"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">{expenses.length ? "No expenses match." : "No expenses yet."}</p>}
      </GlassCard>
    </div>
  );
}
