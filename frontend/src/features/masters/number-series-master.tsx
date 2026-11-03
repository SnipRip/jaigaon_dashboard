"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { financialYearOf } from "@/lib/financial-year";
import { formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { NumberSeriesView, SeriesDocument } from "@/types/number-series";
import { NUMBER_SERIES_PATH, numberSeriesPersistence, toNumberSeries } from "./number-series-api";
import { RecordMaster } from "./record-master";
import type { NumberSeries } from "./types";

export const SERIES_DOCUMENTS: { value: SeriesDocument; label: string }[] = [
  { value: "QUOTATION", label: "Quotation" },
  { value: "SALES_INVOICE", label: "Local tax invoice" },
  { value: "EXPORT_INVOICE", label: "Export invoice" },
  { value: "PURCHASE", label: "Vendor bill" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "PAYMENT", label: "Vendor payment" },
  { value: "CREDIT_NOTE", label: "Credit note" },
  { value: "DEBIT_NOTE", label: "Debit note" },
  { value: "STOCK_JOURNAL", label: "Stock adjustment" },
  { value: "SHIPMENT", label: "Shipment" },
  { value: "EXPENSE", label: "Expense" },
];

// Invoice, credit and debit note numbers must be unique in the financial
// year and at most 16 characters (CGST rule 46); the backend refuses longer.
const MAX_LENGTH = 16;
const label = (document: SeriesDocument) => SERIES_DOCUMENTS.find((option) => option.value === document)?.label ?? document;
const issued = (series: NumberSeries) => `${series.prefix}${String(series.lastIssued).padStart(series.padding, "0")}`;

export function NumberSeriesMaster() {
  const { data, error, mutate } = useSWR<NumberSeriesView[]>(NUMBER_SERIES_PATH, apiGet);
  const series = useMemo(() => data?.map(toNumberSeries), [data]);
  const today = useToday();
  const year = today ? financialYearOf(today) : null;
  if (!series) return <LoadNotice error={error} what="number series" />;

  return (
    <RecordMaster
      noun={["series", "number series"]}
      initialRecords={series}
      persist={numberSeriesPersistence(() => void mutate())}
      nameKey="preview"
      blank={{ financialYear: year ?? "", nextNumber: 1, padding: 4 }}
      fields={[
        { key: "document", label: "Document", kind: "select", options: SERIES_DOCUMENTS, required: true, wide: true },
        { key: "prefix", label: "Prefix", kind: "text", required: true, upperCase: true, placeholder: "INV/2627/", pattern: /^[A-Za-z0-9/-]{1,12}$/, message: "Letters, digits, / and -; up to 12" },
        { key: "financialYear", label: "Financial year", kind: "text", required: true, pattern: /^\d{4}-\d{2}$/, message: "Like 2026-27" },
        { key: "nextNumber", label: "Next number", kind: "number", decimals: 0, required: true, hint: "Once numbers are issued, only this can change, and only upward" },
        { key: "padding", label: "Digits", kind: "number", decimals: 0, required: true, hint: "4 gives 0001" },
      ]}
      columns={[
        { label: "Document", render: (row) => label(row.document) },
        { label: "Year", render: (row) => row.financialYear },
        { label: "Next number", render: (row) => <span className="font-semibold">{row.preview}</span> },
        { label: "Last issued", render: (row) => (row.lastIssued ? issued(row) : <span className="text-muted">None yet</span>) },
        {
          label: "Length",
          render: (row) => (
            <span className={row.preview.length > MAX_LENGTH ? "text-danger-strong" : "text-muted"}>
              {row.preview.length} of {MAX_LENGTH}
              {row.preview.length > MAX_LENGTH && ", too long for GST"}
            </span>
          ),
        },
        { label: "Status", render: (row) => (row.lastIssued ? <StatusChip tone="brand">In use</StatusChip> : null) },
      ]}
      filters={[
        { label: "This year", test: (row) => row.financialYear === year },
        { label: "In use", test: (row) => row.lastIssued > 0 },
      ]}
      searchText={(row) => `${row.prefix} ${label(row.document)} ${row.financialYear}`}
      stats={(records) => {
        const thisYear = records.filter((row) => row.financialYear === year);
        return [
          { label: "Series", value: formatQuantity(records.length) },
          { label: "Financial year", value: year ?? "–" },
          { label: "Set up this year", value: `${thisYear.length} of ${SERIES_DOCUMENTS.length}`, tone: thisYear.length < SERIES_DOCUMENTS.length ? "warning" : undefined },
          { label: "In use", value: formatQuantity(records.filter((row) => row.lastIssued > 0).length) },
        ];
      }}
      importColumns={["Document", "Prefix", "Financial year", "Next number", "Digits"]}
      footnote="Each document type needs its own series for every financial year, from 1 April. Numbers already issued are never reused: a series in use keeps its prefix and digits, and cannot be deleted."
    />
  );
}
