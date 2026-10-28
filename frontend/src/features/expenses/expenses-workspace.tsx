"use client";

import { Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { ALLOCATIONS, allocationLabel } from "@/features/masters/expense-heads-master";
import { formatDayMonth, formatInr } from "@/lib/format";
import type { AllocationTarget } from "./expense-form";
import { expenseGst, sumAmount } from "./expense-rules";
import type { Expense, ExpenseAllocation } from "./types";

interface ExpensesWorkspaceProps {
  expenses: Expense[];
  heads: { id: string; name: string }[];
  /** Vendor and account id → name. */
  names: Record<string, string>;
  targets: AllocationTarget[];
}

const TARGET_PATH: Record<ExpenseAllocation["kind"], string> = { "item-cost": "/purchases", invoice: "/invoices", shipment: "/shipments", overhead: "" };

// Every expense with where its cost lands: on items (landed cost), one
// invoice, one shipment, or general overhead.
export function ExpensesWorkspace({ expenses, heads, names, targets }: ExpensesWorkspaceProps) {
  const [filter, setFilter] = useState<ExpenseAllocation["kind"] | "all">("all");
  const [query, setQuery] = useState("");
  const headName = (id: string) => heads.find((head) => head.id === id)?.name ?? id;
  const payeeOf = (expense: Expense) => (expense.vendorId ? names[expense.vendorId] : expense.payee) ?? "–";
  const needle = query.trim().toLowerCase();
  const visible = expenses.filter(
    (expense) =>
      (filter === "all" || expense.allocation.kind === filter) &&
      (!needle || `${expense.number} ${headName(expense.headId)} ${expense.description} ${payeeOf(expense)} ${expense.reference ?? ""}`.toLowerCase().includes(needle)),
  );
  const byKind = (kind: ExpenseAllocation["kind"]) => sumAmount(expenses.filter((expense) => expense.allocation.kind === kind));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Spent, before GST" value={formatInr(sumAmount(expenses))} />
        <StatTile label="Landed on items" value={formatInr(byKind("item-cost"))} />
        <StatTile label="On invoices and shipments" value={formatInr(byKind("invoice") + byKind("shipment"))} />
        <StatTile label="General overhead" value={formatInr(byKind("overhead"))} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Link href="/expenses/new" className={buttonClasses("primary")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New expense
          </Link>
          <Link href="/masters/expense-heads" className={buttonClasses("neutral", "ml-auto")}>
            <Settings2 aria-hidden="true" className="size-[18px]" />
            Expense heads
          </Link>
        </div>
        <SearchField
          id="expense-search"
          label="Search expenses"
          value={query}
          onChange={setQuery}
          placeholder="Search by number, head, payee or slip number"
          trailing={`${visible.length} of ${expenses.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip selected={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {ALLOCATIONS.map((option) => (
            <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
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
            {visible.map((expense) => {
              const target = targets.find((candidate) => candidate.kind === expense.allocation.kind && candidate.id === expense.allocation.targetId);
              return (
                <tr key={expense.id} className="align-top">
                  <td className="text-left">
                    <span className="font-bold">{expense.number}</span>
                    <div className="text-xs text-muted">
                      {formatDayMonth(expense.date)}
                      {expense.reference && ` · ${expense.reference}`}
                    </div>
                  </td>
                  <td className="text-left">
                    <div className="font-bold">{headName(expense.headId)}</div>
                    <div className="text-xs text-muted">{expense.description}</div>
                  </td>
                  <td className="text-left">{payeeOf(expense)}</td>
                  <td className="font-bold">{formatInr(expense.amount)}</td>
                  <td className="text-muted">{expense.gstRatePct ? formatInr(expenseGst(expense)) : "–"}</td>
                  <td className="text-left">
                    {target ? (
                      <Link href={`${TARGET_PATH[target.kind]}/${target.id}`} className="font-bold text-brand hover:underline">
                        {target.label.split(" · ")[0]}
                      </Link>
                    ) : (
                      <StatusChip tone="neutral">{allocationLabel(expense.allocation.kind)}</StatusChip>
                    )}
                  </td>
                  <td className="text-left">{expense.paidFrom ? names[expense.paidFrom] : <span className="text-warning-strong">Not paid yet</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No expenses match.</p>}
      </GlassCard>
    </div>
  );
}
