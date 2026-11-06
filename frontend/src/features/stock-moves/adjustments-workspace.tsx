"use client";

import { Plus } from "lucide-react";
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
import { formatDayMonth, formatInr, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { AdjustmentDirectionView, StockAdjustmentView } from "@/types/stock-moves";
import { reasonLabel, STATUS_TEXT } from "./stock-move-rules";

type Filter = "ALL" | AdjustmentDirectionView | "CANCELLED";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OUT", label: "Taken out" },
  { value: "IN", label: "Added" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Every stock adjustment, newest first: what was written off or added, and why.
export function AdjustmentsWorkspace({ adjustments }: { adjustments: StockAdjustmentView[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = adjustments.filter(
    (adjustment) =>
      (filter === "ALL" ||
        (filter === "CANCELLED" ? adjustment.status === "CANCELLED" : adjustment.status === "POSTED" && adjustment.direction === filter)) &&
      (!needle ||
        `${adjustment.number} ${adjustment.godownName} ${reasonLabel(adjustment.reason)} ${adjustment.lines.map((line) => line.itemName).join(" ")}`
          .toLowerCase()
          .includes(needle)),
  );
  const month = useToday()?.slice(0, 7) ?? "";
  const posted = adjustments.filter((adjustment) => adjustment.status === "POSTED" && adjustment.date.startsWith(month));
  const sum = (direction: AdjustmentDirectionView) => posted.filter((adjustment) => adjustment.direction === direction).reduce((total, adjustment) => total + adjustment.value, 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
        <StatTile label="Adjustments this month" value={formatQuantity(posted.length)} />
        <StatTile label="Written off this month" value={formatInr(sum("OUT"))} tone={sum("OUT") > 0 ? "danger" : undefined} />
        <StatTile label="Added this month" value={formatInr(sum("IN"))} />
      </div>
      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <Link href="/stock-adjustments/new" className={buttonClasses("primary", undefined, "lg")}>
              <Plus aria-hidden="true" />
              New adjustment
            </Link>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="adjustment-search"
            label="Search adjustments"
            value={query}
            onChange={setQuery}
            placeholder="Number, godown, reason or item"
            trailing={`${visible.length} of ${adjustments.length}`}
          />
          <FilterGroup label="Show">
            {FILTERS.map((option) => (
              <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Adjustment</th>
              <th scope="col" className="text-left">Godown</th>
              <th scope="col" className="text-left">Reason</th>
              <th scope="col" className="text-left">Items</th>
              <th scope="col">Value</th>
              <th scope="col" className="text-left">Status</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((adjustment) => (
              <tr key={adjustment.id} className="align-top">
                <td className="text-left">
                  <Link href={`/stock-adjustments/${adjustment.id}`} className="font-semibold hover:text-brand hover:underline">
                    {adjustment.number}
                  </Link>
                  <div className="text-xs text-muted">{formatDayMonth(adjustment.date)}</div>
                </td>
                <td className="text-left">{adjustment.godownName}</td>
                <td className="text-left">
                  {reasonLabel(adjustment.reason)}
                  <div className="text-xs text-muted">{adjustment.direction === "IN" ? "Added" : "Taken out"}</div>
                </td>
                <td className="text-left text-xs">
                  {adjustment.lines.slice(0, 2).map((line) => (
                    <div key={line.id}>
                      {line.itemName}: {formatQuantity(line.quantity)} {line.unit}
                    </div>
                  ))}
                  {adjustment.lines.length > 2 && <div className="text-muted">+{adjustment.lines.length - 2} more</div>}
                </td>
                <td className={adjustment.direction === "OUT" && adjustment.status === "POSTED" ? "text-danger-strong" : undefined}>
                  {adjustment.direction === "OUT" ? "−" : "+"}
                  {formatInr(adjustment.value)}
                </td>
                <td className="text-left">
                  <StatusChip tone={STATUS_TEXT[adjustment.status].tone}>{STATUS_TEXT[adjustment.status].label}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">{adjustments.length ? "No adjustments match." : "No stock has been written off or added yet."}</p>
        )}
      </GlassCard>
    </div>
  );
}
