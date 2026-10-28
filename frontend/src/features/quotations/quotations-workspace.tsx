"use client";

import { Plus, Search } from "lucide-react";
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
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { formatDayMonth, formatInr, formatPercent, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { quotationFigures, quotationLabel, quotationStage, type QuotationStage } from "./quotation-rules";
import type { Quotation } from "./types";

export const STAGE_TONE: Record<QuotationStage, StatusTone> = {
  Draft: "neutral",
  Sent: "brand",
  Expired: "warning",
  Accepted: "success",
  Rejected: "danger",
  Converted: "success",
};

const FILTERS: (QuotationStage | "All")[] = ["All", "Draft", "Sent", "Expired", "Accepted", "Converted", "Rejected"];

interface QuotationsWorkspaceProps {
  quotations: Quotation[];
  parties: Party[];
  items: Item[];
  companyState: string;
}

// Every quotation with its value, margin and where it stands, and how many
// turn into invoices.
export function QuotationsWorkspace({ quotations, parties, items, companyState }: QuotationsWorkspaceProps) {
  const today = useToday();
  const [filter, setFilter] = useState<QuotationStage | "All">("All");
  const [query, setQuery] = useState("");
  const rows = quotations.map((quotation) => {
    const party = parties.find((candidate) => candidate.id === quotation.partyId)!;
    return { quotation, party, stage: quotationStage(quotation, today), ...quotationFigures(quotation, party, companyState, items) };
  });
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) => (filter === "All" || row.stage === filter) && (!needle || `${quotationLabel(row.quotation)} ${row.party.displayName}`.toLowerCase().includes(needle)));
  const open = rows.filter((row) => row.stage === "Sent");
  const decided = rows.filter((row) => ["Accepted", "Converted", "Rejected"].includes(row.stage));
  const won = decided.filter((row) => row.stage !== "Rejected");

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Quotations" value={formatQuantity(rows.length)} />
        <StatTile label="Waiting on the customer" value={formatInr(open.reduce((sum, row) => sum + row.totals.grandTotal, 0))} />
        <StatTile label="Expired, follow up" value={formatQuantity(rows.filter((row) => row.stage === "Expired").length)} tone="warning" />
        <StatTile label="Won of decided" value={decided.length ? formatPercent((won.length / decided.length) * 100) : "–"} tone="success" />
      </div>
      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <>
              <Link href="/rate-enquiry" className={buttonClasses("neutral")}>
                <Search aria-hidden="true" />
                From rate enquiry
              </Link>
              <Link href="/quotations/new" className={buttonClasses("primary", undefined, "lg")}>
                <Plus aria-hidden="true" />
                New quotation
              </Link>
            </>
          }
        >
          <SearchField className="max-w-[340px] flex-[1_1_240px]" id="quotation-search" label="Search quotations" value={query} onChange={setQuery} placeholder="Search by number or customer" trailing={`${visible.length} of ${rows.length}`} />
          <FilterGroup label="Stage">
            {FILTERS.map((option) => (
              <FilterChip key={option} selected={filter === option} onClick={() => setFilter(option)}>
                {option}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[880px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Quotation</th>
              <th scope="col" className="text-left">Customer</th>
              <th scope="col">Value</th>
              <th scope="col">Margin</th>
              <th scope="col" className="text-left">Valid till</th>
              <th scope="col" className="text-left">Stage</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map(({ quotation, party, stage, totals, profit }) => (
              <tr key={quotation.id} className="align-top">
                <td className="text-left">
                  <Link href={`/quotations/${quotation.id}`} className="font-semibold hover:text-brand hover:underline">
                    {quotationLabel(quotation)}
                  </Link>
                  <div className="text-xs text-muted">
                    {formatDayMonth(quotation.date)} · {quotation.lines.length} items
                  </div>
                </td>
                <td className="text-left">
                  <div className="font-semibold">{party.displayName}</div>
                  {party.priceLevel && <div className="text-xs text-muted">{party.priceLevel}</div>}
                </td>
                <td className="font-semibold">{formatInr(totals.grandTotal)}</td>
                <td className={profit.marginPct < 8 ? "text-danger-strong" : undefined}>{formatPercent(profit.marginPct)}</td>
                <td className="text-left">{formatDayMonth(quotation.validUntil)}</td>
                <td className="text-left">
                  <StatusChip tone={STAGE_TONE[stage]}>{stage}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No quotations match.</p>}
      </GlassCard>
    </div>
  );
}
