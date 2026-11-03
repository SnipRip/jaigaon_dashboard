"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";
import type { AccountHeadView } from "@/types/account-head";
import { isExpenseHead } from "./account-head-rules";
import { ACCOUNT_HEADS_PATH, accountHeadPersistence, toAccountHead, withArchived } from "./masters-api";
import { RecordMaster } from "./record-master";
import type { AccountHead, HeadAllocation, HeadGst, HeadNature } from "./types";

export const ALLOCATIONS: { value: HeadAllocation; label: string; hint: string }[] = [
  { value: "item-cost", label: "Item cost (landed cost)", hint: "Spread over the items of a purchase" },
  { value: "invoice", label: "One invoice", hint: "Reduces the profit of one sale" },
  { value: "shipment", label: "One shipment", hint: "Reduces the profit of one export shipment" },
  { value: "overhead", label: "General overhead", hint: "Not tied to one sale; shown in P&L only" },
];

const GST: { value: HeadGst; label: string }[] = [
  { value: "follows-bill", label: "Follows the bill's rate" },
  { value: "own-rate", label: "Its own rate" },
  { value: "none", label: "No GST" },
];

// Each nature is the Tally group the head's ledger goes under.
const NATURES: { value: HeadNature; group: string; label: string }[] = [
  { value: "direct-expense", group: "Direct Expenses", label: "Direct expense: part of the cost of goods (freight, labour)" },
  { value: "indirect-expense", group: "Indirect Expenses", label: "Indirect expense: running the business (rent, salary)" },
  { value: "direct-income", group: "Direct Incomes", label: "Direct income: earned from the trading itself" },
  { value: "indirect-income", group: "Indirect Incomes", label: "Indirect income: interest, commission, discount received" },
];
const EXPENSES = { key: "nature", values: ["direct-expense", "indirect-expense"] };

/** The GST slabs the backend accepts for a head with its own rate. */
const GST_RATES = ["5", "12", "18", "28", "40"];

// Ledger names go to Tally as typed (same rule as the backend DTO).
const LEDGER_NAME = /^[A-Za-z0-9][A-Za-z0-9 &.,()/'-]{1,59}$/;
const LEDGER_NAME_MESSAGE = "2 to 60 letters, digits, spaces and & . , ( ) / ' -";

export const allocationLabel = (allocation: HeadAllocation) => ALLOCATIONS.find((option) => option.value === allocation)?.label ?? allocation;

const gstLabel = (head: AccountHead) => (head.gst === "own-rate" ? `${head.gstRatePct ?? 0}%` : GST.find((option) => option.value === head.gst)?.label);

// Expense and income heads (masters-plan.md rows 23 and 24). Each is a Tally
// ledger; its nature picks the group (Direct / Indirect Expenses or Incomes),
// so nobody picks a group by hand. An expense head's allocation decides
// where its cost lands for actual profit (SOW 14).
export function ExpenseHeadsMaster() {
  const { data, error, mutate } = useSWR<AccountHeadView[]>(withArchived(ACCOUNT_HEADS_PATH), apiGet);
  const heads = useMemo(() => data?.map(toAccountHead), [data]);
  if (!heads) return <LoadNotice error={error} what="expense and income heads" />;

  return (
    <RecordMaster
      noun={["head", "expense and income heads"]}
      initialRecords={heads}
      persist={accountHeadPersistence(() => void mutate())}
      nameKey="name"
      blank={{ nature: "indirect-expense", gst: "none", allocation: "overhead" }}
      fields={[
        { key: "name", label: "Head name", kind: "text", required: true, placeholder: "Freight Inward", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "The Tally ledger name. Must match the ledger in Tally." },
        { key: "nature", label: "What kind of head", kind: "select", required: true, options: NATURES.map(({ value, label }) => ({ value, label })), wide: true },
        { key: "gst", label: "GST", kind: "select", required: true, options: GST, showWhen: EXPENSES },
        { key: "gstRatePct", label: "GST rate", kind: "select", required: true, options: GST_RATES.map((rate) => ({ value: rate, label: `${rate}%` })), showWhen: { key: "gst", values: ["own-rate"] } },
        { key: "allocation", label: "Cost lands on", kind: "select", required: true, options: ALLOCATIONS.map(({ value, label }) => ({ value, label })), hint: "An indirect expense is always a general overhead.", wide: true, showWhen: EXPENSES },
        { key: "notes", label: "Notes", kind: "text", maxLength: 500, wide: true },
      ]}
      columns={[
        {
          label: "Head",
          render: (head) => (
            <span>
              {head.name}
              <span className="block text-xs font-medium text-muted">{head.tallyGroup}</span>
            </span>
          ),
        },
        { label: "GST", render: (head) => (isExpenseHead(head) ? gstLabel(head) : "–") },
        {
          label: "Cost lands on",
          render: (head) =>
            head.allocation ? <StatusChip tone={head.allocation === "overhead" ? "neutral" : "brand"}>{allocationLabel(head.allocation)}</StatusChip> : "–",
        },
        { label: "Notes", render: (head) => <span className="text-muted">{head.notes ?? ""}</span> },
      ]}
      searchText={(head) => `${head.name} ${head.tallyGroup ?? ""} ${head.notes ?? ""}`}
      filters={[
        ...NATURES.map(({ value, group }) => ({ label: group, test: (head: AccountHead) => head.nature === value })),
        { label: "Landed cost", test: (head: AccountHead) => head.allocation === "item-cost" },
      ]}
      stats={(records) => [
        { label: "Heads", value: formatQuantity(records.length) },
        { label: "Expense heads", value: formatQuantity(records.filter(isExpenseHead).length) },
        { label: "Income heads", value: formatQuantity(records.filter((head) => !isExpenseHead(head)).length) },
        { label: "Land on item cost", value: formatQuantity(records.filter((head) => head.allocation === "item-cost").length) },
      ]}
      importMaster="account-heads"
      footnote="Each head is a Tally ledger under the group shown. Loan entries post to Bank Charges, Interest on Loan and Interest Received: those keep their name and stay live."
    />
  );
}
