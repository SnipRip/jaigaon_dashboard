"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { ImportDialog } from "@/components/ui/import-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { treatmentLabel, type GstTreatment } from "@/features/gst/gst-rules";
import { formatInr, formatQuantity } from "@/lib/format";
import { matchesPartySearch, placeOf, ROLE_TEXT, taxFor } from "./party-rules";
import type { Party, PartyRole } from "./types";

type TreatmentFilter = "all" | "with-gstin" | "without-gstin" | "overseas";

const FILTERS: { value: TreatmentFilter; label: string; treatments?: GstTreatment[] }[] = [
  { value: "all", label: "All" },
  { value: "with-gstin", label: "With GSTIN", treatments: ["registered", "composition", "sez"] },
  { value: "without-gstin", label: "Without GSTIN", treatments: ["unregistered", "consumer"] },
  { value: "overseas", label: "Outside India", treatments: ["overseas"] },
];

interface PartiesWorkspaceProps {
  role: PartyRole;
  parties: Party[];
  companyState: string;
}

// The customer list or the vendor list: one screen, two roles. Every row
// shows the tax its documents will carry, decided by gst-rules.ts.
export function PartiesWorkspace({ role, parties, companyState }: PartiesWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TreatmentFilter>("all");
  const text = ROLE_TEXT[role];

  const mine = parties.filter((party) => party.roles.includes(role));
  const allowed = FILTERS.find((option) => option.value === filter)?.treatments;
  const visible = mine.filter((party) => (!allowed || allowed.includes(party.treatment)) && matchesPartySearch(party, query));

  const outstanding = mine.reduce((sum, party) => sum + party.outstanding, 0);
  const noCredit = mine.filter((party) => taxFor(role, companyState, party).itc === false).length;
  const overseas = mine.filter((party) => party.treatment === "overseas").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label={role === "customer" ? "Customers" : "Vendors"} value={formatQuantity(mine.length)} />
        <StatTile label={role === "customer" ? "Receivable" : "Payable"} value={formatInr(outstanding)} />
        {role === "customer" ? (
          <StatTile label="Bhutan and overseas" value={formatQuantity(overseas)} />
        ) : (
          <StatTile label="No GST bill" value={formatQuantity(noCredit)} />
        )}
        <StatTile label="With GSTIN" value={formatQuantity(mine.filter((party) => party.gstin).length)} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`${text.path}/new`} className={buttonClasses("primary")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New {text.one}
          </Link>
          <div className="ml-auto">
            <ImportDialog
              what={text.many}
              columns={["Name", "Legal name", "GST treatment", "GSTIN", "State code", "Phone", "Email", "Address", "City", "PIN", "Credit days", "Opening balance"]}
            />
          </div>
        </div>

        <SearchField
          id={`${role}-search`}
          label={`Search ${text.many}`}
          value={query}
          onChange={setQuery}
          placeholder="Search by name, GSTIN, phone or town"
          trailing={`${visible.length} of ${mine.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>

        <GlassTable className="min-w-[860px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Name</th>
              <th scope="col" className="text-left">GST</th>
              <th scope="col" className="text-left">Place</th>
              <th scope="col" className="text-left">{role === "customer" ? "Tax on our invoices" : "Their bills"}</th>
              <th scope="col">Credit</th>
              <th scope="col">{role === "customer" ? "Receivable" : "Payable"}</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((party) => {
              const tax = taxFor(role, companyState, party);
              return (
                <tr key={party.id} className="align-top">
                  <td className="text-left">
                    <Link href={`${text.path}/${party.id}`} className="font-bold hover:text-brand hover:underline">
                      {party.displayName}
                    </Link>
                    <div className="text-xs text-muted">{[party.contactPerson, party.phone].filter(Boolean).join(" · ")}</div>
                    {party.roles.length > 1 && (
                      <div className="mt-1">
                        <StatusChip tone="neutral">Customer and vendor</StatusChip>
                      </div>
                    )}
                  </td>
                  <td className="text-left">
                    <div>{treatmentLabel(party.treatment)}</div>
                    <div className="text-xs text-muted">{party.gstin ?? party.foreignTaxId ?? "No GSTIN"}</div>
                  </td>
                  <td className="text-left">{placeOf(party)}</td>
                  <td className="text-left">
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip tone="brand">{tax.title}</StatusChip>
                      {role === "vendor" && (
                        <StatusChip tone={tax.itc ? "success" : "warning"}>{tax.itc ? "Input credit" : "No input credit"}</StatusChip>
                      )}
                    </div>
                  </td>
                  <td>{party.creditDays === 0 ? "Cash" : `${party.creditDays} days`}</td>
                  <td className={party.outstanding > 0 ? "font-bold" : "text-muted"}>{formatInr(party.outstanding)}</td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No {text.many} match.</p>}
      </GlassCard>
    </div>
  );
}
