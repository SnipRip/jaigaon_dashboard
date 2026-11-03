"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { ViewTabs } from "@/components/ui/view-tabs";
import { RecordMaster } from "@/features/masters/record-master";
import { withArchived } from "@/features/masters/masters-api";
import { apiGet } from "@/lib/api-client";
import { formatInr, formatQuantity } from "@/lib/format";
import type { LedgerGroupView, LedgerView } from "@/types/ledger";
import {
  groupPersistence,
  LEDGER_GROUPS_PATH,
  LEDGERS_PATH,
  ledgerPersistence,
  NATURES,
  natureLabel,
  NO_TAX,
  PRIMARY,
  TAX_KINDS,
  toGroupRecord,
  toLedgerRecord,
  type GroupRecord,
  type LedgerRecord,
} from "./ledgers-api";

// Ledger and group names go to Tally as typed (same rule as the backend).
const LEDGER_NAME = /^[A-Za-z0-9][A-Za-z0-9 &.,()/'-]{1,59}$/;
const LEDGER_NAME_MESSAGE = "2 to 60 letters, digits, spaces and & . , ( ) / ' -";
const PRIMARY_ONLY = { key: "parentId", values: [PRIMARY] };

type View = "groups" | "ledgers";

/** "₹1,200 Dr" / "₹1,200 Cr"; a zero balance shows a dash. */
const openingText = (amount: number, side: string) => (amount ? `${formatInr(amount)} ${side === "DR" ? "Dr" : "Cr"}` : "–");

// Tally's chart of accounts: the 28 groups (and any the business adds) and
// the general ledgers no other master owns: capital, sales, purchase, GST,
// TDS, round off, fixed assets (agent/accounts-plan.md, "Our chart of
// accounts"). Parties, bank accounts, loans and heads keep their own masters.
export function LedgersScreen() {
  const [view, setView] = useState<View>("ledgers");
  const groupsQuery = useSWR<LedgerGroupView[]>(LEDGER_GROUPS_PATH, apiGet);
  const ledgersQuery = useSWR<LedgerView[]>(withArchived(LEDGERS_PATH), apiGet);
  const groups = useMemo(() => groupsQuery.data?.map(toGroupRecord), [groupsQuery.data]);
  const ledgers = useMemo(() => ledgersQuery.data?.map(toLedgerRecord), [ledgersQuery.data]);
  if (!groups || !ledgers || !groupsQuery.data) return <LoadNotice error={groupsQuery.error ?? ledgersQuery.error} what="groups and ledgers" />;

  const reload = () => {
    void groupsQuery.mutate();
    void ledgersQuery.mutate();
  };
  const groupOptions = groupsQuery.data.map((group) => ({ value: group.id, label: group.parentName ? `${group.name} · ${group.primaryName}` : group.name }));
  // A tax kind only makes sense under Duties & Taxes or a group below it.
  const dutyGroups = groupsQuery.data
    .filter((group) => group.name === "Duties & Taxes" || isBelow(groupsQuery.data!, group, "Duties & Taxes"))
    .map((group) => group.id);

  return (
    <div className="flex flex-col gap-3.5">
      <ViewTabs
        label="Groups or ledgers"
        value={view}
        onChange={setView}
        tabs={[
          { value: "ledgers", label: "General ledgers", count: ledgers.filter((ledger) => !ledger.archived).length },
          { value: "groups", label: "Groups", count: groups.length },
        ]}
      />
      {view === "ledgers" ? (
        <RecordMaster<LedgerRecord>
          noun={["ledger", "general ledgers"]}
          initialRecords={ledgers}
          persist={ledgerPersistence(reload)}
          nameKey="name"
          blank={{ openingSide: "DR", taxKind: NO_TAX }}
          fields={[
            { key: "name", label: "Ledger name", kind: "text", required: true, placeholder: "Truck WB73E1234", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "The Tally ledger name; no other ledger or group may use it." },
            { key: "groupId", label: "Under group", kind: "select", options: groupOptions, hint: "Decides where it shows: Balance Sheet or Profit & Loss." },
            { key: "openingBalance", label: "Opening balance (₹)", kind: "number" },
            { key: "openingSide", label: "Dr or Cr", kind: "select", required: true, options: [{ value: "DR", label: "Dr (asset, expense)" }, { value: "CR", label: "Cr (liability, income)" }] },
            { key: "taxKind", label: "Tax it holds", kind: "select", options: TAX_KINDS, showWhen: { key: "groupId", values: dutyGroups } },
            { key: "notes", label: "Notes", kind: "text", maxLength: 500, wide: true },
          ]}
          columns={[
            {
              label: "Ledger",
              render: (ledger) => (
                <span>
                  {ledger.name}
                  <span className="block text-xs font-medium text-muted">{ledger.view.path.length ? ledger.view.path.join(" › ") : "Primary"}</span>
                </span>
              ),
            },
            { label: "Opening", align: "right", render: (ledger) => openingText(ledger.openingBalance, ledger.openingSide) },
            { label: "Used by", render: (ledger) => (ledger.view.systemRole ? <StatusChip tone="brand">The app posts here</StatusChip> : <StatusChip tone="neutral">Yours</StatusChip>) },
            { label: "Notes", render: (ledger) => <span className="text-muted">{ledger.notes ?? ""}</span> },
          ]}
          searchText={(ledger) => `${ledger.name} ${ledger.view.path.join(" ")} ${ledger.notes ?? ""}`}
          filters={[
            { label: "Balance Sheet", test: (ledger) => ledger.view.nature === "ASSET" || ledger.view.nature === "LIABILITY" },
            { label: "Profit & Loss", test: (ledger) => ledger.view.nature === "INCOME" || ledger.view.nature === "EXPENSE" },
            { label: "Duties & Taxes", test: (ledger) => ledger.view.path.includes("Duties & Taxes") },
            { label: "The app posts here", test: (ledger) => Boolean(ledger.view.systemRole) },
          ]}
          stats={(records) => [
            { label: "Ledgers", value: formatQuantity(records.length) },
            { label: "The app posts to", value: formatQuantity(records.filter((ledger) => ledger.view.systemRole).length) },
            { label: "Tax ledgers", value: formatQuantity(records.filter((ledger) => ledger.taxKind !== NO_TAX).length) },
            { label: "With an opening balance", value: formatQuantity(records.filter((ledger) => ledger.openingBalance > 0).length) },
          ]}
          importMaster="ledgers"
          footnote="Customers, vendors, bank and cash, loans and expense & income heads are ledgers too; they live in their own masters. The ledgers the app posts to keep their name and stay live. Profit & Loss A/c sits under Primary: its opening balance is the profit or loss brought forward."
        />
      ) : (
        <RecordMaster<GroupRecord>
          noun={["group", "groups"]}
          initialRecords={groups}
          persist={groupPersistence(reload)}
          nameKey="name"
          blank={{ parentId: PRIMARY, nature: "EXPENSE", affectsGrossProfit: false, behavesAsSubLedger: false, nettBalances: false, position: 0 }}
          fields={[
            { key: "name", label: "Group name", kind: "text", required: true, placeholder: "Vehicles", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE },
            { key: "parentId", label: "Under", kind: "select", required: true, options: [{ value: PRIMARY, label: "Primary (a top-level group)" }, ...groupOptions], hint: "A sub-group takes the nature of the group above it." },
            { key: "nature", label: "Nature", kind: "select", required: true, options: NATURES, showWhen: PRIMARY_ONLY },
            { key: "affectsGrossProfit", label: "Affects gross profit", kind: "toggle", onLabel: "Yes (trading)", offLabel: "No", hint: "Income and expense groups only: Sales, Purchase and Direct groups do.", showWhen: PRIMARY_ONLY },
            { key: "behavesAsSubLedger", label: "In reports", kind: "toggle", onLabel: "Fold its ledgers", offLabel: "Show each ledger" },
            { key: "nettBalances", label: "Balances", kind: "toggle", onLabel: "Nett Dr / Cr", offLabel: "Dr and Cr apart" },
            { key: "position", label: "Position", kind: "number", decimals: 0, hint: "Order among its siblings in the statements." },
            { key: "notes", label: "Notes", kind: "text", maxLength: 500, wide: true },
          ]}
          columns={[
            {
              label: "Group",
              render: (group) => (
                <span>
                  {group.name}
                  <span className="block text-xs font-medium text-muted">{group.view.parentName ? `under ${group.view.parentName}` : "Primary"}</span>
                </span>
              ),
            },
            { label: "Nature", render: (group) => natureLabel(group.view.nature) },
            { label: "Gross profit", render: (group) => (group.view.affectsGrossProfit ? <StatusChip tone="brand">Trading</StatusChip> : "–") },
            { label: "General ledgers", align: "right", render: (group) => formatQuantity(group.view.ledgerCount) },
            { label: "", render: (group) => (group.view.isPredefined ? <StatusChip tone="neutral">Tally</StatusChip> : <StatusChip tone="success">Yours</StatusChip>) },
          ]}
          searchText={(group) => `${group.name} ${group.view.parentName ?? ""} ${group.view.primaryName}`}
          filters={[
            ...NATURES.map(({ value, label }) => ({ label: label.split(" (")[0], test: (group: GroupRecord) => group.view.nature === value })),
            { label: "Yours", test: (group) => !group.view.isPredefined },
          ]}
          stats={(records) => [
            { label: "Groups", value: formatQuantity(records.length) },
            { label: "Tally's own", value: formatQuantity(records.filter((group) => group.view.isPredefined).length) },
            { label: "Yours", value: formatQuantity(records.filter((group) => !group.view.isPredefined).length) },
            { label: "Primary", value: formatQuantity(records.filter((group) => group.parentId === PRIMARY).length) },
          ]}
          footnote="Tally's 28 groups (15 primary, 13 sub-groups) keep their name, place and nature; only the display options change. Add your own sub-groups under them. A group with sub-groups or ledgers cannot be deleted."
        />
      )}
    </div>
  );
}

function isBelow(groups: LedgerGroupView[], group: LedgerGroupView, ancestor: string): boolean {
  const byId = new Map(groups.map((item) => [item.id, item]));
  for (let parent = group.parentId ? byId.get(group.parentId) : undefined, depth = 0; parent && depth < 50; depth += 1) {
    if (parent.name === ancestor) return true;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return false;
}
