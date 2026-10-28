"use client";

import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { Unit, UnitKind } from "./types";

const KINDS: { value: UnitKind; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "weight", label: "Weight" },
  { value: "volume", label: "Volume" },
  { value: "length", label: "Length" },
  { value: "area", label: "Area" },
];
const kindLabel = (kind: UnitKind) => KINDS.find((option) => option.value === kind)?.label ?? kind;

interface UnitsMasterProps {
  units: Unit[];
  /** Unit symbol → items using it as base unit. */
  itemCounts: Record<string, number>;
}

// Units only. Conversions (1 bundle = 25 kg) belong to each item, because
// they differ item to item (masters-plan.md, "Units the brochure already needs").
export function UnitsMaster({ units, itemCounts }: UnitsMasterProps) {
  return (
    <RecordMaster
      noun={["unit", "units"]}
      initialRecords={units}
      nameKey="symbol"
      blank={{ kind: "count", decimals: 0 }}
      fields={[
        { key: "symbol", label: "Symbol", kind: "text", required: true, placeholder: "kg", hint: "As printed on documents", maxLength: 12 },
        { key: "name", label: "Name", kind: "text", required: true, placeholder: "Kilogram" },
        { key: "kind", label: "Measures", kind: "select", options: KINDS, required: true },
        { key: "decimals", label: "Decimals allowed", kind: "number", decimals: 0, required: true, hint: "0 for pieces, 3 for kg" },
        {
          key: "uqc",
          label: "GST unit code (UQC)",
          kind: "text",
          required: true,
          upperCase: true,
          pattern: /^[A-Za-z]{3}$/,
          message: "Three letters, e.g. KGS",
          hint: "Used on e-way bills and e-invoices",
        },
      ]}
      columns={[
        { label: "Symbol", render: (unit) => unit.symbol },
        { label: "Name", render: (unit) => unit.name },
        { label: "Measures", render: (unit) => kindLabel(unit.kind) },
        { label: "Decimals", render: (unit) => unit.decimals, align: "right" },
        { label: "UQC", render: (unit) => unit.uqc },
      ]}
      searchText={(unit) => `${unit.symbol} ${unit.name} ${unit.uqc}`}
      filters={KINDS.map((kind) => ({ label: kind.label, test: (unit: Unit) => unit.kind === kind.value }))}
      stats={(records) => [
        { label: "Units", value: formatQuantity(records.length) },
        { label: "Count units", value: formatQuantity(records.filter((unit) => unit.kind === "count").length) },
        { label: "Weight and volume", value: formatQuantity(records.filter((unit) => unit.kind === "weight" || unit.kind === "volume").length) },
        { label: "In use on items", value: formatQuantity(records.filter((unit) => itemCounts[unit.symbol]).length) },
      ]}
      usage={(unit) => itemCounts[unit.symbol] ?? 0}
      importColumns={["Symbol", "Name", "Measures", "Decimals", "UQC"]}
      footnote="Conversions such as 1 bundle = 25 kg are set on each item. Used in = items with this base unit."
    />
  );
}
