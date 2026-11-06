"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { IconAction } from "@/components/ui/icon-action";
import { ApiError, apiGet } from "@/lib/api-client";
import { formatDate, formatDayMonth, formatInr } from "@/lib/format";
import type { ExpenseView } from "@/types/expense";
import type { ShipmentView } from "@/types/shipment";
import { linkShipmentExpenses, UNLINKED_EXPENSES_PATH, unlinkShipmentExpense } from "./shipments-api";

// The expenses this truck carries: those spent on it (freight, agent,
// border charges) and those booked on its invoices. Shipment expenses saved
// before the shipment was entered wait here to be linked (the client chose
// "save now, link later", 8 Nov 2026); one linked by mistake can be taken off.
export function ShipmentExpensesCard({ shipment, onChanged }: { shipment: ShipmentView; onChanged: (next: ShipmentView) => Promise<void> }) {
  const live = !shipment.cancelledAt;
  const unlinked = useSWR<ExpenseView[]>(live ? UNLINKED_EXPENSES_PATH : null, apiGet);
  const waiting = (unlinked.data ?? []).filter((expense) => !expense.cancelledAt);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const expenses = shipment.expenses ?? [];

  const run = async (action: () => Promise<ShipmentView>) => {
    setBusy(true);
    setProblem(null);
    try {
      await onChanged(await action());
      setPicked([]);
      await unlinked.mutate();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>Expenses on this shipment</CardTitle>
        {live && (
          <Link href={`/expenses/new?shipment=${shipment.id}`} className={buttonClasses("outline", "ml-auto")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            Add an expense
          </Link>
        )}
      </div>
      {expenses.length === 0 ? (
        <p className="text-sm font-semibold text-muted">No freight, agent or border charges booked yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {expenses.map((expense) => (
            <li key={expense.id} className="glass-inset flex flex-wrap items-center justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
              <span className="min-w-0">
                <span className="font-semibold">{expense.head}</span>
                <span className="font-semibold text-ink-soft"> · {expense.description}</span>
                <span className="block text-xs font-semibold text-muted">
                  <Link href={`/expenses/${expense.id}`} className="text-brand hover:underline">
                    {expense.number}
                  </Link>{" "}
                  · {formatDate(expense.date)} · {expense.payeeName}
                  {expense.invoice ? ` · on ${expense.invoice.number}` : ""}
                  {expense.cancelled ? " · cancelled" : ""}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-2">
                <span className={expense.cancelled ? "font-semibold text-muted tabular-nums line-through" : "font-semibold tabular-nums"}>{formatInr(expense.cost)}</span>
                {live && !expense.invoice && (
                  <IconAction label={`Take ${expense.number} off this shipment`} onClick={() => run(() => unlinkShipmentExpense(shipment.id, expense.id))}>
                    <X aria-hidden="true" className="size-4" />
                  </IconAction>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs font-semibold text-muted">Amounts are the cost to profit: before GST, plus any GST that cannot be claimed back.</p>

      {live && waiting.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3">
          <p className="text-sm font-semibold">Shipment expenses not linked to a shipment yet</p>
          <FilterGroup label="Expenses to link">
            {waiting.map((expense) => (
              <FilterChip
                key={expense.id}
                selected={picked.includes(expense.id)}
                onClick={() => setPicked((value) => (value.includes(expense.id) ? value.filter((id) => id !== expense.id) : [...value, expense.id]))}
                className="h-auto py-2 text-left"
              >
                <span className="block">
                  {expense.number} · {formatInr(expense.cost)}
                </span>
                <span className="block text-xs font-semibold text-muted">
                  {expense.head.name} · {expense.description} · {formatDayMonth(expense.date)}
                </span>
              </FilterChip>
            ))}
          </FilterGroup>
          <Button variant="primary" className="self-start" disabled={!picked.length || busy} onClick={() => run(() => linkShipmentExpenses(shipment.id, picked))}>
            Link {picked.length > 1 ? `${picked.length} expenses` : "to this shipment"}
          </Button>
        </div>
      )}
      {problem && <FormMessage tone="error">{problem}</FormMessage>}
    </GlassCard>
  );
}
