import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { AttentionList } from "@/features/dashboard/attention-list";
import { attentionItems, datedAlerts, kpis, pendingQuotations, shipmentCounts, shipmentRows, tradingWeeks } from "@/features/dashboard/dashboard-data";
import { KpiCards } from "@/features/dashboard/kpi-cards";
import { PendingQuotationsTable } from "@/features/dashboard/pending-quotations-table";
import { ShipmentsCard } from "@/features/dashboard/shipments-card";
import { TradingChart } from "@/features/dashboard/trading-chart";

export const metadata: Metadata = { title: "Dashboard" };

// Two-thirds / one-third rows that stack on narrow screens.
const SPLIT_ROW = "grid gap-4 xl:grid-cols-[2fr_1fr]";

export default function DashboardPage() {
  return (
    <>
      <SampleDataNotice />
      <KpiCards kpis={kpis} />
      <div className={SPLIT_ROW}>
        <TradingChart data={tradingWeeks} />
        <AttentionList items={attentionItems} dated={datedAlerts} />
      </div>
      <div className={SPLIT_ROW}>
        <PendingQuotationsTable quotations={pendingQuotations} />
        <ShipmentsCard counts={shipmentCounts} shipments={shipmentRows} />
      </div>
    </>
  );
}
