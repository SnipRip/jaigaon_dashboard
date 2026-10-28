"use client";

import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { NumberSeries, SeriesDocument } from "./types";

export const SERIES_DOCUMENTS: { value: SeriesDocument; label: string }[] = [
  { value: "quotation", label: "Quotation" },
  { value: "invoice", label: "Local tax invoice" },
  { value: "export-invoice", label: "Export invoice" },
  { value: "bill", label: "Vendor bill" },
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Vendor payment" },
  { value: "credit-note", label: "Credit note" },
  { value: "debit-note", label: "Debit note" },
  { value: "shipment", label: "Shipment" },
  { value: "expense", label: "Expense" },
  { value: "stock-journal", label: "Stock adjustment" },
];

const preview = (series: NumberSeries) => `${series.prefix}${String(series.nextNumber).padStart(series.padding, "0")}`;

// Invoice numbers must be unique in the financial year and at most 16
// characters (CGST rule 46), so the preview is checked against that.
export function NumberSeriesMaster({ series }: { series: NumberSeries[] }) {
  const issued = (records: NumberSeries[], document: SeriesDocument) => (records.find((row) => row.document === document)?.nextNumber ?? 1) - 1;
  return (
    <RecordMaster
      noun={["series", "number series"]}
      initialRecords={series}
      nameKey="prefix"
      blank={{ financialYear: "2026-27", nextNumber: 1, padding: 4 }}
      fields={[
        { key: "document", label: "Document", kind: "select", options: SERIES_DOCUMENTS, required: true, wide: true },
        { key: "prefix", label: "Prefix", kind: "text", required: true, upperCase: true, pattern: /^[A-Za-z0-9/-]{1,10}$/, message: "Letters, digits, / and -; up to 10" },
        { key: "financialYear", label: "Financial year", kind: "text", required: true, pattern: /^\d{4}-\d{2}$/, message: "Like 2026-27" },
        { key: "nextNumber", label: "Next number", kind: "number", decimals: 0, required: true },
        { key: "padding", label: "Digits", kind: "number", decimals: 0, required: true, hint: "4 gives 0001" },
      ]}
      columns={[
        { label: "Document", render: (row) => SERIES_DOCUMENTS.find((document) => document.value === row.document)?.label },
        { label: "Year", render: (row) => row.financialYear },
        { label: "Next number", render: (row) => <span className="font-extrabold">{preview(row)}</span> },
        {
          label: "Length",
          render: (row) => (
            <span className={preview(row).length > 16 ? "text-danger-strong" : "text-muted"}>
              {preview(row).length} of 16{preview(row).length > 16 && ", too long for GST"}
            </span>
          ),
        },
      ]}
      searchText={(row) => `${row.prefix} ${row.document} ${row.financialYear}`}
      stats={(records) => [
        { label: "Series", value: formatQuantity(records.length) },
        { label: "Financial year", value: records[0]?.financialYear ?? "–" },
        { label: "Invoices this year", value: formatQuantity(issued(records, "invoice") + issued(records, "export-invoice")) },
        { label: "Over 16 characters", value: formatQuantity(records.filter((row) => preview(row).length > 16).length) },
      ]}
      importColumns={["Document", "Prefix", "Financial year", "Next number", "Digits"]}
      footnote="A new year's series starts on 1 April. Numbers already issued are never reused."
    />
  );
}
