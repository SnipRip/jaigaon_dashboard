"use client";

import { ArrowRight, Plus } from "lucide-react";
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
import type { StockMoveStatusView, StockTransferView } from "@/types/stock-moves";
import { STATUS_TEXT } from "./stock-move-rules";

const FILTERS: (StockMoveStatusView | "ALL")[] = ["ALL", "POSTED", "CANCELLED"];

// Every stock transfer, newest first, with what it moved and its cost.
export function TransfersWorkspace({ transfers }: { transfers: StockTransferView[] }) {
  const [filter, setFilter] = useState<StockMoveStatusView | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = transfers.filter(
    (transfer) =>
      (filter === "ALL" || transfer.status === filter) &&
      (!needle ||
        `${transfer.number} ${transfer.fromGodownName} ${transfer.toGodownName} ${transfer.lines.map((line) => line.itemName).join(" ")}`.toLowerCase().includes(needle)),
  );
  const posted = transfers.filter((transfer) => transfer.status === "POSTED");
  const month = useToday()?.slice(0, 7) ?? "";
  const thisMonth = posted.filter((transfer) => transfer.date.startsWith(month));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
        <StatTile label="Transfers" value={formatQuantity(posted.length)} />
        <StatTile label="This month" value={formatQuantity(thisMonth.length)} />
        <StatTile label="Value moved this month" value={formatInr(thisMonth.reduce((sum, transfer) => sum + transfer.value, 0))} />
      </div>
      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <Link href="/stock-transfers/new" className={buttonClasses("primary", undefined, "lg")}>
              <Plus aria-hidden="true" />
              New transfer
            </Link>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="transfer-search"
            label="Search transfers"
            value={query}
            onChange={setQuery}
            placeholder="Number, godown or item"
            trailing={`${visible.length} of ${transfers.length}`}
          />
          <FilterGroup label="Show">
            {FILTERS.map((option) => (
              <FilterChip key={option} selected={filter === option} onClick={() => setFilter(option)}>
                {option === "ALL" ? "All" : STATUS_TEXT[option].label}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Transfer</th>
              <th scope="col" className="text-left">Godowns</th>
              <th scope="col" className="text-left">Items</th>
              <th scope="col">Value</th>
              <th scope="col" className="text-left">Status</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((transfer) => (
              <tr key={transfer.id} className="align-top">
                <td className="text-left">
                  <Link href={`/stock-transfers/${transfer.id}`} className="font-semibold hover:text-brand hover:underline">
                    {transfer.number}
                  </Link>
                  <div className="text-xs text-muted">{formatDayMonth(transfer.date)}</div>
                </td>
                <td className="text-left">
                  <span className="inline-flex items-center gap-1.5">
                    {transfer.fromGodownName}
                    <ArrowRight aria-label="to" className="size-3.5 text-muted" />
                    {transfer.toGodownName}
                  </span>
                </td>
                <td className="text-left text-xs">
                  {transfer.lines.slice(0, 2).map((line) => (
                    <div key={line.id}>
                      {line.itemName}: {formatQuantity(line.quantity)} {line.unit}
                    </div>
                  ))}
                  {transfer.lines.length > 2 && <div className="text-muted">+{transfer.lines.length - 2} more</div>}
                </td>
                <td>{formatInr(transfer.value)}</td>
                <td className="text-left">
                  <StatusChip tone={STATUS_TEXT[transfer.status].tone}>{STATUS_TEXT[transfer.status].label}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">{transfers.length ? "No transfers match." : "No stock has been moved between godowns yet."}</p>
        )}
      </GlassCard>
    </div>
  );
}
