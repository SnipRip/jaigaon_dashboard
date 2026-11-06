"use client";

import clsx from "clsx";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { LoanRemindersCard } from "@/features/loans/loan-reminders-card";
import { apiGet } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { DashboardView } from "@/types/dashboard";
import { AttentionList } from "./attention-list";
import { attentionItems, dashboardKpis, pendingQuotations, shipmentSummary, tradingWeeks } from "./dashboard-cards";
import { KpiCards } from "./kpi-cards";
import { PendingQuotationsTable } from "./pending-quotations-table";
import { ShipmentsCard } from "./shipments-card";
import { TradingChart } from "./trading-chart";

export const DASHBOARD_PATH = "/dashboard";

/** Two-thirds / one-third when both cards show; stacks on narrow screens. */
const row = (both: boolean) => clsx("grid gap-3.5", both && "xl:grid-cols-[2fr_1fr]");

// The Dashboard from one backend call. Cards for screens the user's role may
// not open come back empty and are left out.
export function DashboardScreen() {
  const { data, error } = useSWR<DashboardView>(DASHBOARD_PATH, apiGet);
  if (!data) return <LoadNotice error={error} what="the dashboard" />;

  const kpis = dashboardKpis(data);
  const chart = tradingWeeks(data);
  const attention = attentionItems(data);
  const dues = data.outstanding?.dues ?? [];
  const showChart = chart.series.length > 0;
  const showAttention = attention.length > 0 || dues.length > 0;
  const shipments = data.shipments && shipmentSummary(data.shipments);

  return (
    <>
      <p className="text-[12.5px] font-medium text-muted">
        This financial year, {formatDate(data.from)} to {formatDate(data.to)}
      </p>
      {kpis.length > 0 && <KpiCards kpis={kpis} />}
      {/* For those who may see loans; hidden for everyone else. */}
      <LoanRemindersCard />
      {(showChart || showAttention) && (
        <div className={row(showChart && showAttention)}>
          {showChart && <TradingChart data={chart.weeks} shown={chart.series} />}
          {showAttention && <AttentionList items={attention} dues={dues} />}
        </div>
      )}
      {(data.quotations || shipments) && (
        <div className={row(!!data.quotations && !!shipments)}>
          {data.quotations && <PendingQuotationsTable quotations={pendingQuotations(data)} />}
          {shipments && <ShipmentsCard counts={shipments.counts} shipments={shipments.rows} />}
        </div>
      )}
    </>
  );
}
