"use client";

import { useState } from "react";
import useSWR from "swr";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { LoadNotice } from "@/components/ui/load-notice";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { StatTile } from "@/components/ui/stat-tile";
import { TextField } from "@/components/ui/text-field";
import { ViewTabs } from "@/components/ui/view-tabs";
import { apiGet } from "@/lib/api-client";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BalanceSheetView, BooksBasis, ProfitAndLossView, TrialBalanceView } from "@/types/ledger";
import { booksPath, drCr } from "./books-api";
import { BalanceSheetStatement, ProfitAndLossStatement } from "./statement-views";
import { TrialBalanceTable } from "./trial-balance-table";

type View = "chart" | "trial" | "pl" | "bs";

const TABS: { value: View; label: string }[] = [
  { value: "chart", label: "Chart of accounts" },
  { value: "trial", label: "Trial balance" },
  { value: "pl", label: "Profit & Loss" },
  { value: "bs", label: "Balance sheet" },
];

// The books as Tally keeps them (agent/accounts-plan.md, "How Tally keeps
// its books"): every ledger from every master under its group, then the
// Trial Balance, Profit & Loss and Balance Sheet from the start of the
// books to the chosen date. Real data only.
export function FinancialStatementsScreen() {
  const today = useToday();
  const [view, setView] = useState<View>("chart");
  const [picked, setPicked] = useState("");
  const [showLedgers, setShowLedgers] = useState(false);
  const asOf = picked || today;

  return (
    <div className="flex flex-col gap-3.5">
      <ViewTabs label="Statement" tabs={TABS} value={view} onChange={setView} />
      <ListToolbar actions={<TextField label="As on" type="date" value={asOf ?? ""} onChange={(event) => setPicked(event.target.value)} />}>
        {view === "trial" && (
          <FilterGroup label="Detail">
            <FilterChip selected={!showLedgers} onClick={() => setShowLedgers(false)}>
              Groups
            </FilterChip>
            <FilterChip selected={showLedgers} onClick={() => setShowLedgers(true)}>
              Every ledger
            </FilterChip>
          </FilterGroup>
        )}
      </ListToolbar>
      {asOf && <StatementBody view={view} asOf={asOf} showLedgers={showLedgers} />}
    </div>
  );
}

function StatementBody({ view, asOf, showLedgers }: { view: View; asOf: string; showLedgers: boolean }) {
  const trial = useSWR<TrialBalanceView>(view === "chart" || view === "trial" ? booksPath("trial-balance", asOf) : null, apiGet);
  const pl = useSWR<ProfitAndLossView>(view === "pl" ? booksPath("profit-and-loss", asOf) : null, apiGet);
  const bs = useSWR<BalanceSheetView>(view === "bs" ? booksPath("balance-sheet", asOf) : null, apiGet);

  if (view === "chart" || view === "trial") {
    if (!trial.data) return <LoadNotice error={trial.error} what="the books" />;
    const data = trial.data;
    return (
      <>
        <Basis basis={data} difference={-data.differenceInOpening} />
        <GlassCard className="flex flex-col gap-3">
          <CardTitle>{view === "chart" ? "Every ledger under its group" : `Trial balance as on ${formatDate(asOf)}`}</CardTitle>
          {view === "chart" && (
            <p className="-mt-1.5 text-sm font-medium text-muted">
              Tally&rsquo;s groups with every ledger the app keeps, from whichever master owns it. Click a ledger to open it.
            </p>
          )}
          <TrialBalanceTable trial={data} ledgers={view === "chart" || showLedgers} mode={view === "chart" ? "chart" : "trial"} />
        </GlassCard>
      </>
    );
  }
  if (view === "pl") {
    if (!pl.data) return <LoadNotice error={pl.error} what="the Profit & Loss" />;
    return (
      <>
        <Basis basis={pl.data} />
        <div className="grid gap-3.5 sm:grid-cols-3">
          <StatTile label="Gross profit" value={formatRate(pl.data.grossProfit)} />
          <StatTile label="Nett profit" value={formatRate(pl.data.netProfit)} tone={pl.data.netProfit < 0 ? "danger" : undefined} />
          <StatTile label="Closing stock" value={formatRate(pl.data.closingStock)} />
        </div>
        <ProfitAndLossStatement pl={pl.data} />
      </>
    );
  }
  if (!bs.data) return <LoadNotice error={bs.error} what="the Balance Sheet" />;
  return (
    <>
      {/* The sheet's difference is credit positive; the notice shows the balancing side, as the trial balance does. */}
      <Basis basis={bs.data} difference={-bs.data.differenceInOpening} />
      <BalanceSheetStatement sheet={bs.data} />
    </>
  );
}

const counted = (count: number, noun: string) => `${formatQuantity(count)} ${noun}${count === 1 ? "" : "s"}`;

// What the figures are built from, and the opening difference Tally would
// show, so nobody reads sample-free totals as the whole business.
function Basis({ basis, difference = 0 }: { basis: BooksBasis; difference?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted">
        From the start of the books to {formatDate(basis.asOf)}: opening balances of every master, opening stock at cost ({formatRate(basis.stock.opening)}),{" "}
        {counted(basis.documentCounts.invoices, "invoice")}, {counted(basis.documentCounts.bills, "vendor bill")}, {counted(basis.documentCounts.receipts, "receipt")},{" "}
        {counted(basis.documentCounts.payments, "vendor payment")}, {counted(basis.voucherCount, "loan voucher")} and {counted(basis.stockAdjustmentCount, "stock adjustment")}.
        Cancelled and void documents post nothing. Closing stock ({formatRate(basis.stock.closing)}) is the opening stock plus what bills brought in at landed cost and stock
        added, less stock written off and the cost of goods invoiced. Expenses post here once they are saved for real.
      </p>
      {difference !== 0 && (
        <p className="rounded-(--radius-tile) bg-warning-tint px-4 py-2.5 text-sm font-semibold">
          Difference in opening balances: {drCr(difference)}. The opening balances entered in the masters do not agree (Tally shows the same line). Usually the owners&rsquo; capital or a loan&rsquo;s opening is missing: enter it on Owner&rsquo;s Capital in Groups &amp; ledgers.
        </p>
      )}
    </div>
  );
}
