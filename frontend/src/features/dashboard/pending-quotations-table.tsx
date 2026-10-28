"use client";

import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { quotationStage } from "@/features/quotations/quotation-rules";
import { STAGE_TONE } from "@/features/quotations/quotations-workspace";
import { formatDayMonth, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { PendingQuotation } from "./types";

// Quotations still in play: drafts, sent, and accepted ones not yet invoiced.
// A sent one past its validity reads as expired, judged in the browser.
export function PendingQuotationsTable({ quotations }: { quotations: PendingQuotation[] }) {
  const today = useToday();
  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CardTitle>Pending quotations and orders</CardTitle>
        <Link href="/quotations" className="ml-auto text-xs font-semibold text-brand hover:underline">
          All quotations
        </Link>
      </div>
      <GlassTable className="min-w-[620px]">
        <thead>
          <tr className="text-left">
            <th scope="col">Quotation</th>
            <th scope="col">Customer</th>
            <th scope="col" className="text-right">Value</th>
            <th scope="col">Valid till</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody className="font-semibold tabular-nums">
          {quotations.map((quotation) => {
            const stage = quotationStage(quotation, today);
            return (
              <tr key={quotation.id}>
                <td>
                  <Link href={`/quotations/${quotation.id}`} className="font-semibold hover:text-brand hover:underline">
                    {quotation.label}
                  </Link>
                </td>
                <td>{quotation.customer}</td>
                <td className="text-right">{formatInr(quotation.value)}</td>
                <td>{formatDayMonth(quotation.validUntil)}</td>
                <td>
                  <StatusChip tone={STAGE_TONE[stage]}>{stage === "Accepted" ? "Accepted, to invoice" : stage}</StatusChip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </GlassTable>
      {quotations.length === 0 && <p className="py-4 text-center text-sm font-semibold text-muted">No quotations waiting.</p>}
    </GlassCard>
  );
}
