"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { ExpenseHead } from "./types";

export const ALLOCATIONS: { value: ExpenseHead["allocation"]; label: string; hint: string }[] = [
  { value: "item-cost", label: "Item cost (landed cost)", hint: "Spread over the items of a purchase" },
  { value: "invoice", label: "One invoice", hint: "Reduces the profit of one sale" },
  { value: "shipment", label: "One shipment", hint: "Reduces the profit of one export shipment" },
  { value: "overhead", label: "General overhead", hint: "Not tied to one sale; shown in P&L only" },
];

const GST = [
  { value: "follows-bill", label: "Follows the bill's rate" },
  { value: "own-rate", label: "Its own rate" },
  { value: "none", label: "No GST" },
];

export const allocationLabel = (allocation: ExpenseHead["allocation"]) => ALLOCATIONS.find((option) => option.value === allocation)?.label ?? allocation;

// Expense and charge heads (masters-plan.md F23). The allocation decides
// where the cost lands for actual profit (SOW 14); nobody picks a ledger group.
export function ExpenseHeadsMaster({ heads, expenseCounts }: { heads: ExpenseHead[]; expenseCounts: Record<string, number> }) {
  return (
    <RecordMaster
      noun={["expense head", "expense heads"]}
      initialRecords={heads}
      nameKey="name"
      blank={{ kind: "direct", gst: "none", allocation: "overhead" }}
      fields={[
        { key: "name", label: "Name", kind: "text", required: true, placeholder: "Freight inward" },
        {
          key: "kind",
          label: "Kind",
          kind: "select",
          required: true,
          options: [
            { value: "direct", label: "Direct: part of trading cost" },
            { value: "indirect", label: "Indirect: running the business" },
          ],
        },
        { key: "gst", label: "GST", kind: "select", required: true, options: GST },
        { key: "gstRatePct", label: "GST rate % (if its own rate)", kind: "number", decimals: 0 },
        { key: "allocation", label: "Cost lands on", kind: "select", required: true, options: ALLOCATIONS.map(({ value, label }) => ({ value, label })), wide: true },
        { key: "notes", label: "Notes", kind: "text", wide: true },
      ]}
      columns={[
        { label: "Head", render: (head) => head.name },
        { label: "Kind", render: (head) => (head.kind === "direct" ? "Direct" : "Indirect") },
        { label: "GST", render: (head) => (head.gst === "own-rate" ? `${head.gstRatePct ?? 0}%` : GST.find((option) => option.value === head.gst)?.label) },
        {
          label: "Cost lands on",
          render: (head) => <StatusChip tone={head.allocation === "overhead" ? "neutral" : "brand"}>{allocationLabel(head.allocation)}</StatusChip>,
        },
      ]}
      searchText={(head) => `${head.name} ${head.notes ?? ""}`}
      filters={ALLOCATIONS.map((allocation) => ({ label: allocation.label, test: (head: ExpenseHead) => head.allocation === allocation.value }))}
      stats={(records) => [
        { label: "Heads", value: formatQuantity(records.length) },
        { label: "Direct", value: formatQuantity(records.filter((head) => head.kind === "direct").length) },
        { label: "Land on item cost", value: formatQuantity(records.filter((head) => head.allocation === "item-cost").length) },
        { label: "Overheads", value: formatQuantity(records.filter((head) => head.allocation === "overhead").length) },
      ]}
      usage={(head) => expenseCounts[head.id] ?? 0}
      importColumns={["Name", "Direct / indirect", "GST", "GST rate %", "Cost lands on"]}
      footnote="Picked on every expense and on freight, loading and labour bills."
    />
  );
}
