"use client";

import { Globe, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { stateName } from "@/features/gst/indian-states";
import type { Party } from "@/features/parties/types";
import { formatDayMonth, formatInr, formatQuantity } from "@/lib/format";
import { documentsFor } from "./dispatch-documents";
import { invoiceStage, invoiceTax, invoiceTotals, missingDocuments, needsEinvoice } from "./invoice-rules";
import { InvoiceStageChip } from "./invoice-stage-chip";
import type { Invoice, InvoiceKind } from "./types";

interface InvoicesWorkspaceProps {
  invoices: Invoice[];
  parties: Party[];
  companyState: string;
}

// All sales invoices, local and export, with what each still needs: an
// export is done only when its customs papers and BRC are attached.
export function InvoicesWorkspace({ invoices, parties, companyState }: InvoicesWorkspaceProps) {
  const [kind, setKind] = useState<InvoiceKind | "all">("all");
  const [query, setQuery] = useState("");

  const rows = invoices.map((invoice) => {
    const party = parties.find((candidate) => candidate.id === invoice.partyId)!;
    const tax = invoiceTax(companyState, invoice, party);
    const totals = invoiceTotals(invoice.lines, tax.regime);
    return { invoice, party, tax, totals, stage: invoiceStage(invoice), missing: missingDocuments(invoice, totals.grandTotal, needsEinvoice(invoice, party)) };
  });
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    ({ invoice, party }) =>
      (kind === "all" || invoice.kind === kind) &&
      (!needle || `${invoice.number} ${party.displayName}`.toLowerCase().includes(needle)),
  );

  const exportsOpen = rows.filter((row) => row.invoice.kind === "export" && row.invoice.status === "issued" && row.stage !== "Payment realised");
  const awaitingBrc = exportsOpen.filter((row) => row.invoice.documents.leo || row.invoice.documents["shipping-bill"]).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Invoices" value={formatQuantity(rows.length)} />
        <StatTile label="Billed" value={formatInr(rows.reduce((sum, row) => sum + row.totals.grandTotal, 0))} />
        <StatTile label="Exports still open" value={formatQuantity(exportsOpen.length)} />
        <StatTile label="Waiting for BRC" value={formatQuantity(awaitingBrc)} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Link href="/invoices/new/local" className={buttonClasses("primary")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New local invoice
          </Link>
          <Link href="/invoices/new/export" className={buttonClasses("success")}>
            <Globe aria-hidden="true" className="size-[18px]" />
            New export invoice
          </Link>
        </div>

        <SearchField
          id="invoice-search"
          label="Search invoices"
          value={query}
          onChange={setQuery}
          placeholder="Search by invoice number or customer"
          trailing={`${visible.length} of ${rows.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "local", "export"] as const).map((option) => (
            <FilterChip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {option === "all" ? "All invoices" : option === "local" ? "Local (GST)" : "Export"}
            </FilterChip>
          ))}
        </div>

        <GlassTable className="min-w-[900px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Invoice</th>
              <th scope="col" className="text-left">Customer</th>
              <th scope="col" className="text-left">Tax</th>
              <th scope="col">Taxable</th>
              <th scope="col">Total</th>
              <th scope="col" className="text-left">Stage</th>
              <th scope="col" className="text-left">Documents</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map(({ invoice, party, tax, totals, stage, missing }) => {
              const needed = invoice.kind === "export" ? documentsFor("export").length : missing.length + Object.keys(invoice.documents).length;
              return (
                <tr key={invoice.id} className="align-top">
                  <td className="text-left">
                    <Link href={`/invoices/${invoice.id}`} className="font-bold hover:text-brand hover:underline">
                      {invoice.number}
                    </Link>
                    <div className="text-xs text-muted">
                      {formatDayMonth(invoice.date)} · {invoice.kind === "export" ? "Export" : "Local"}
                    </div>
                  </td>
                  <td className="text-left">
                    <div className="font-bold">{party.displayName}</div>
                    <div className="text-xs text-muted">
                      {invoice.kind === "export" ? invoice.destinationCountry : stateName(invoice.placeOfSupply)}
                    </div>
                  </td>
                  <td className="text-left">
                    <StatusChip tone={invoice.kind === "export" ? "success" : "brand"}>{tax.title}</StatusChip>
                  </td>
                  <td>{formatInr(totals.taxable)}</td>
                  <td className="font-bold">{formatInr(totals.grandTotal)}</td>
                  <td className="text-left">
                    <InvoiceStageChip stage={stage} />
                  </td>
                  <td className="text-left text-xs">
                    {invoice.status === "draft" ? (
                      <span className="text-muted">After issue</span>
                    ) : missing.length === 0 ? (
                      <span className="text-success-strong">All attached</span>
                    ) : (
                      <span className="text-warning-strong">
                        {needed - missing.length} of {needed} · missing {missing.length}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No invoices match.</p>}
      </GlassCard>
    </div>
  );
}
