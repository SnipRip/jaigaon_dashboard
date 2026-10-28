"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import type { SelectOption } from "@/components/ui/select-field";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDayMonth, formatQuantity } from "@/lib/format";
import type { RegisterEntry, RegisterKind } from "./document-register";
import { UploadDocumentDialog } from "./upload-document-dialog";

interface MissingEntry {
  invoiceId: string;
  invoiceNumber: string;
  party: string;
  name: string;
}

interface DocumentsWorkspaceProps {
  entries: RegisterEntry[];
  missing: MissingEntry[];
  kinds: { value: RegisterKind; label: string }[];
  owners: SelectOption[];
}

// Every document number in one searchable register: shipping bills, LEOs,
// e-way bills, BRCs, packing lists, vendor bills. Search finds them by
// number, vehicle, invoice or party (SOW 12 and 17).
export function DocumentsWorkspace({ entries, missing, kinds, owners }: DocumentsWorkspaceProps) {
  const [kind, setKind] = useState<RegisterKind | "all">("all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = entries.filter(
    (entry) =>
      (kind === "all" || entry.kind === kind) &&
      (!needle || `${entry.name} ${entry.number} ${entry.owner.label} ${entry.party} ${entry.vehicle ?? ""} ${entry.shipment?.label ?? ""}`.toLowerCase().includes(needle)),
  );
  const present = kinds.filter((option) => entries.some((entry) => entry.kind === option.value));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Documents on record" value={formatQuantity(entries.length)} />
        <StatTile label="Required, not attached" value={formatQuantity(missing.length)} tone={missing.length ? "warning" : undefined} />
        <StatTile label="Shipping bills and LEOs" value={formatQuantity(entries.filter((entry) => entry.kind === "shipping-bill" || entry.kind === "leo").length)} />
        <StatTile label="With a scan" value={formatQuantity(entries.filter((entry) => entry.fileName).length)} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle>Register</CardTitle>
            <div className="ml-auto">
              <UploadDocumentDialog kinds={kinds} owners={owners} />
            </div>
          </div>
          <SearchField
            id="document-search"
            label="Search documents"
            value={query}
            onChange={setQuery}
            placeholder="Shipping bill, LEO or e-way bill number, vehicle, invoice or party"
            trailing={`${visible.length} of ${entries.length}`}
            prominent
          />
          <div className="flex flex-wrap gap-2">
            <FilterChip selected={kind === "all"} onClick={() => setKind("all")}>
              All
            </FilterChip>
            {present.map((option) => (
              <FilterChip key={option.value} selected={kind === option.value} onClick={() => setKind(option.value)}>
                {option.label}
              </FilterChip>
            ))}
          </div>
          <GlassTable className="min-w-[860px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Document</th>
                <th scope="col" className="text-left">Number</th>
                <th scope="col" className="text-left">Belongs to</th>
                <th scope="col" className="text-left">Vehicle</th>
                <th scope="col" className="text-left">Scan</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {visible.map((entry) => (
                <tr key={`${entry.kind}-${entry.owner.label}-${entry.number}`} className="align-top">
                  <td>
                    <div className="font-bold">{entry.name}</div>
                    <div className="text-xs text-muted">{formatDayMonth(entry.date)}</div>
                  </td>
                  <td className="max-w-[220px] truncate tabular-nums">
                    {entry.number}
                  </td>
                  <td>
                    <Link href={entry.owner.href} className="font-bold text-brand hover:underline">
                      {entry.owner.label}
                    </Link>
                    <div className="text-xs text-muted">
                      {entry.party}
                      {entry.shipment && (
                        <>
                          {" · "}
                          <Link href={entry.shipment.href} className="hover:underline">
                            {entry.shipment.label}
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{entry.vehicle ?? "–"}</td>
                  <td className="text-xs">
                    {entry.fileName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Paperclip aria-hidden="true" className="size-3.5 text-muted" />
                        {entry.fileName}
                      </span>
                    ) : (
                      <span className="text-muted">No scan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
          {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No documents match.</p>}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-4">
          <CardTitle>Still to attach</CardTitle>
          {missing.length === 0 ? (
            <p className="text-sm font-semibold text-success-strong">Every issued invoice has its required papers.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {missing.map((entry) => (
                <li key={`${entry.invoiceId}-${entry.name}`} className="glass-inset flex flex-col rounded-[18px] px-4 py-2.5">
                  <span className="text-sm font-bold">{entry.name}</span>
                  <span className="text-xs font-semibold text-muted">
                    <Link href={`/invoices/${entry.invoiceId}`} className="font-bold text-brand hover:underline">
                      {entry.invoiceNumber}
                    </Link>{" "}
                    · {entry.party}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
