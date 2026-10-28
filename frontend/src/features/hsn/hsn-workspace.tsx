"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatusChip } from "@/components/ui/status-chip";
import { HsnForm } from "./hsn-form";
import { latestRate, matchesHsnSearch } from "./hsn-rules";
import type { CodeKind, HsnCode } from "./types";
import { formatDate } from "@/lib/format";

interface HsnWorkspaceProps {
  initialCodes: HsnCode[];
  /** Code → number of items whose HSN resolves to it. */
  usage: Record<string, number>;
  gstRates: number[];
}

// The HSN / SAC master: list on the left, the picked code's editor and rate
// history on the right. Edits stay on this page until it is connected to the
// database.
export function HsnWorkspace({ initialCodes, usage, gstRates }: HsnWorkspaceProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CodeKind | "all">("all");
  const [selectedCode, setSelectedCode] = useState(initialCodes[0]?.code);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = codes.filter((hsn) => (kind === "all" || hsn.kind === kind) && matchesHsnSearch(hsn, query));
  const selected = codes.find((hsn) => hsn.code === selectedCode);

  const save = (updated: HsnCode) => {
    setCodes((current) =>
      current.some((hsn) => hsn.code === updated.code)
        ? current.map((hsn) => (hsn.code === updated.code ? updated : hsn))
        : [...current, updated].sort((a, b) => a.code.localeCompare(b.code)),
    );
    setSelectedCode(updated.code);
    setAdding(false);
    setNotice(`${updated.kind} ${updated.code} saved on this page. It is not saved to the database yet.`);
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Codes · {codes.length}</CardTitle>
          <Button className="ml-auto" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New code
          </Button>
        </div>
        <SearchField
          id="hsn-search"
          label="Search HSN and SAC codes"
          value={query}
          onChange={setQuery}
          placeholder="Search by code or description"
          trailing={`${visible.length} of ${codes.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "HSN", "SAC"] as const).map((option) => (
            <FilterChip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {option === "all" ? "All codes" : option === "HSN" ? "HSN · goods" : "SAC · services"}
            </FilterChip>
          ))}
        </div>
        <GlassTable className="min-w-[620px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Code</th>
              <th scope="col" className="text-left">Description</th>
              <th scope="col">GST</th>
              <th scope="col">Items</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((hsn) => (
              <tr key={hsn.code} className={clsx(hsn.code === selectedCode && "bg-brand-tint/60")}>
                <td className="text-left">
                  <button
                    type="button"
                    aria-pressed={hsn.code === selectedCode}
                    onClick={() => setSelectedCode(hsn.code)}
                    className="font-extrabold text-brand hover:underline"
                  >
                    {hsn.code}
                  </button>
                  <div className="text-xs text-muted">{hsn.kind}</div>
                </td>
                <td className="text-left">
                  {hsn.description}
                  {hsn.reverseCharge && (
                    <span className="ml-1.5">
                      <StatusChip tone="warning">Reverse charge</StatusChip>
                    </span>
                  )}
                </td>
                <td className="font-bold">{latestRate(hsn)}%</td>
                <td className="text-muted">{usage[hsn.code] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No codes match.</p>}
        <p className="text-xs font-semibold text-muted">
          Items take their GST rate from their HSN code. Shipping bills need the full 8-digit code; add it here when the
          customs agent confirms it.
        </p>
      </GlassCard>

      <div className="flex flex-col gap-4 xl:sticky xl:top-4">
        {selected ? (
          <GlassCard className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {selected.kind} {selected.code}
              </CardTitle>
              <StatusChip tone="brand">{latestRate(selected)}% GST</StatusChip>
              <span className="ml-auto text-xs font-bold text-muted">Used by {usage[selected.code] ?? 0} items</span>
            </div>
            <HsnForm
              key={`${selected.code}-${selected.rates.length}`}
              hsn={selected}
              gstRates={gstRates}
              takenCodes={codes.map((hsn) => hsn.code)}
              onSave={save}
            />
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <span className="text-xs font-bold text-muted">Rate history</span>
              <ol className="flex flex-col gap-1.5">
                {[...selected.rates].reverse().map((change, index) => (
                  <li key={change.from} className="flex items-center justify-between text-sm font-semibold">
                    <span>From {formatDate(change.from)}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {change.ratePct}%{index === 0 && <StatusChip tone="success">Latest</StatusChip>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="text-sm font-semibold text-muted">Pick a code to see and edit it.</p>
          </GlassCard>
        )}
        {notice && <FormMessage tone="success">{notice}</FormMessage>}
      </div>

      <GlassModal open={adding} onOpenChange={setAdding} title="New HSN or SAC code" description="Goods use HSN codes, services SAC codes.">
        {adding && (
          <HsnForm gstRates={gstRates} takenCodes={codes.map((hsn) => hsn.code)} onSave={save} onCancel={() => setAdding(false)} />
        )}
      </GlassModal>
    </div>
  );
}
