"use client";

import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatDate, formatInr, formatQuantity } from "@/lib/format";
import type { Report, ReportColumn, ReportRow } from "./types";

const ALL = "all";

const show = (column: ReportColumn, value: string | number | undefined) => {
  if (value === undefined || value === "") return "–";
  switch (column.kind) {
    case "money":
      return formatInr(Number(value));
    case "quantity":
      return formatQuantity(Number(value));
    case "percent":
      return `${value}%`;
    case "date":
      return formatDate(String(value));
    default:
      return String(value);
  }
};

const csvCell = (value: string | number | undefined) => {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Any report: period and party filters, search, totals, print and a CSV
// download built in the browser (opens in Excel; Tally import uses it).
export function ReportView({ report }: { report: Report }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [party, setParty] = useState(ALL);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const parties = report.partyKey ? [...new Set(report.rows.map((row) => String(row[report.partyKey!])))].sort() : [];

  const visible = report.rows.filter((row) => {
    const date = report.dateKey ? String(row[report.dateKey]) : undefined;
    return (
      (!from || !date || date >= from) &&
      (!to || !date || date <= to) &&
      (party === ALL || !report.partyKey || row[report.partyKey] === party) &&
      (!needle || report.columns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(needle)))
    );
  });
  const totalled = report.columns.filter((column) => (column.kind === "money" || column.kind === "quantity") && column.total !== false);
  const totalOf = (key: string) => Math.round(visible.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) * 100) / 100;

  const download = () => {
    const lines = [report.columns.map((column) => csvCell(column.label)).join(","), ...visible.map((row) => report.columns.map((column) => csvCell(row[column.key])).join(","))];
    const url = URL.createObjectURL(new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.id}${from ? `-from-${from}` : ""}${to ? `-to-${to}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <GlassCard className="flex flex-wrap items-end gap-3">
        {report.dateKey && (
          <>
            <div className="w-[150px]">
              <TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="w-[150px]">
              <TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          </>
        )}
        {report.partyKey && (
          <SelectField
            className="w-[220px]"
            label="Party"
            options={[{ value: ALL, label: "Everyone" }, ...parties.map((name) => ({ value: name, label: name }))]}
            value={party}
            onValueChange={setParty}
          />
        )}
        <SearchField className="h-[34px] max-w-[300px] flex-[1_1_200px]" id="report-search" label="Search this report" value={query} onChange={setQuery} placeholder="Search rows" trailing={`${visible.length} rows`} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="neutral" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
          <Button variant="neutral" onClick={download}>
            <Download aria-hidden="true" />
            Download CSV
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="print-area flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{report.title}</CardTitle>
          <p className="text-sm font-medium text-muted">
            {report.description}
            {(from || to) && ` Period ${from ? formatDate(from) : "start"} to ${to ? formatDate(to) : "today"}.`}
          </p>
        </div>
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr>
              {report.columns.map((column) => (
                <th key={column.key} scope="col" className={column.kind === "text" || column.kind === "date" ? "text-left" : "text-right"}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-semibold tabular-nums">
            {visible.map((row: ReportRow, index) => (
              <tr key={index}>
                {report.columns.map((column, columnIndex) => (
                  <td key={column.key} className={column.kind === "text" || column.kind === "date" ? "text-left" : "text-right"}>
                    {columnIndex === 1 && row.href ? (
                      <Link href={row.href} className="font-semibold hover:text-brand hover:underline">
                        {show(column, row[column.key])}
                      </Link>
                    ) : (
                      show(column, row[column.key])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totalled.length > 0 && (
            <tfoot className="font-semibold tabular-nums">
              <tr className="border-t border-line">
                {report.columns.map((column, index) => (
                  <td key={column.key} className={column.kind === "text" || column.kind === "date" ? "text-left" : "text-right"}>
                    {totalled.includes(column) ? show(column, totalOf(column.key)) : index === 0 ? "Total" : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No rows in this period.</p>}
      </GlassCard>
    </div>
  );
}
