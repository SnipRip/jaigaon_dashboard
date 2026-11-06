"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format";
import type { RegisterEntryView, RegisterKindView } from "@/types/document-register";
import { ownerHref, REGISTER_KINDS, registerKindName } from "./documents-api";

// Every document number in one searchable list: IRNs, challans, e-way bills,
// customs papers, BRCs, vendor bills. Search finds one by number, vehicle,
// invoice, bill, shipment or party (SOW 12 and 17).
export function RegisterTableCard({ entries }: { entries: RegisterEntryView[] }) {
  const [kind, setKind] = useState<RegisterKindView | "all">("all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = entries.filter(
    (entry) =>
      (kind === "all" || entry.kind === kind) &&
      (!needle ||
        `${registerKindName(entry.kind)} ${entry.number} ${entry.owner.number} ${entry.partyName} ${entry.vehicle ?? ""} ${entry.shipment?.number ?? ""}`
          .toLowerCase()
          .includes(needle)),
  );
  const present = REGISTER_KINDS.filter((option) => entries.some((entry) => entry.kind === option));

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <ListToolbar>
        <CardTitle>Register</CardTitle>
        <SearchField
          className="max-w-[340px] flex-[1_1_240px]"
          id="document-search"
          label="Search documents"
          value={query}
          onChange={setQuery}
          placeholder="Number, vehicle, invoice, shipment or party"
          trailing={`${visible.length} of ${entries.length}`}
        />
        <FilterGroup label="Document kind">
          <FilterChip selected={kind === "all"} onClick={() => setKind("all")}>
            All
          </FilterChip>
          {present.map((option) => (
            <FilterChip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {registerKindName(option)}
            </FilterChip>
          ))}
        </FilterGroup>
      </ListToolbar>
      <GlassTable className="min-w-[760px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Document</th>
            <th scope="col" className="text-left">Number</th>
            <th scope="col" className="text-left">Belongs to</th>
            <th scope="col" className="text-left">Vehicle</th>
          </tr>
        </thead>
        <tbody className="font-semibold">
          {visible.map((entry) => (
            <tr key={`${entry.kind}-${entry.owner.id}-${entry.number}`} className="align-top">
              <td>
                <div className="font-semibold">{registerKindName(entry.kind)}</div>
                <div className="text-xs text-muted">{formatDate(entry.date)}</div>
              </td>
              <td className="max-w-[240px]">
                <div className="truncate font-mono text-[12.5px] tabular-nums" title={entry.number}>
                  {entry.number}
                </div>
              </td>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={ownerHref(entry.owner)} className="font-semibold text-brand hover:underline">
                    {entry.owner.number}
                  </Link>
                  {entry.cancelled && <StatusChip tone="neutral">{entry.owner.type === "INVOICE" ? "Cancelled" : "Void"}</StatusChip>}
                </div>
                <div className="text-xs text-muted">
                  {entry.partyName}
                  {entry.shipment && (
                    <>
                      {" · "}
                      <Link href={`/shipments/${entry.shipment.id}`} className="hover:underline">
                        {entry.shipment.number}
                      </Link>
                    </>
                  )}
                </div>
              </td>
              <td>{entry.vehicle ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </GlassTable>
      {visible.length === 0 && (
        <p className="py-6 text-center text-[13px] text-muted">{entries.length ? "No documents match." : "No documents yet. Papers are attached on each invoice's page."}</p>
      )}
    </GlassCard>
  );
}
