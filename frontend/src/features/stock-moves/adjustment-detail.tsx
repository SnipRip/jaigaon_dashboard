"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import type { StockAdjustmentView } from "@/types/stock-moves";
import { CancelStockMove } from "./cancel-stock-move";
import { StockDrawsList } from "./stock-draws-list";
import { reasonLabel, STATUS_TEXT } from "./stock-move-rules";
import { cancelAdjustment } from "./stock-moves-api";

// One stock adjustment: what was written off (and which batches, at what
// cost) or what was added at the cost typed.
export function AdjustmentDetail({ adjustment, onChanged }: { adjustment: StockAdjustmentView; onChanged: () => Promise<void> }) {
  const posted = adjustment.status === "POSTED";
  const adding = adjustment.direction === "IN";
  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{adjustment.number}</CardTitle>
            <StatusChip tone={STATUS_TEXT[adjustment.status].tone}>{STATUS_TEXT[adjustment.status].label}</StatusChip>
            <StatusChip tone={adding ? "brand" : "warning"}>{adding ? "Stock added" : "Stock taken out"}</StatusChip>
            <Link href="/stock-adjustments" className={buttonClasses("neutral", "ml-auto")}>
              Back to adjustments
            </Link>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <FactTile label="Date">{formatDate(adjustment.date)}</FactTile>
            <FactTile label="Godown">{adjustment.godownName}</FactTile>
            <FactTile label="Reason">{reasonLabel(adjustment.reason)}</FactTile>
          </dl>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>{adding ? "Items added" : "Items taken out"}</CardTitle>
          <GlassTable className="min-w-[640px]">
            <thead>
              <tr className="text-right">
                <th scope="col" className="text-left">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col" className={adding ? undefined : "text-left"}>{adding ? "Cost per unit" : "Taken from"}</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody className="text-right font-semibold tabular-nums">
              {adjustment.lines.map((line) => (
                <tr key={line.id} className="align-top">
                  <td className="text-left">
                    <Link href={`/items/${line.itemId}`} className="font-semibold hover:text-brand hover:underline">
                      {line.itemName}
                    </Link>
                    <div className="text-xs text-muted">{line.sku}</div>
                  </td>
                  <td>
                    {formatQuantity(line.quantity)} {line.unit}
                  </td>
                  {adding ? (
                    <td>{line.rate === null ? "–" : formatRate(line.rate)}</td>
                  ) : (
                    <td className="text-left text-xs">
                      <StockDrawsList draws={line.draws} unit={line.unit} empty="Put back on cancel" />
                    </td>
                  )}
                  <td>{formatRate(line.value)}</td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <FactTile label={adding ? "Value added" : "Value written off"}>
            <span className={adding ? undefined : "text-danger-strong"}>{formatInr(adjustment.value)}</span>
          </FactTile>
          <FactTile label="Entered by">{adjustment.createdBy ?? "–"}</FactTile>
        </dl>
        {adjustment.notes && <p className="text-sm font-semibold text-muted">{adjustment.notes}</p>}
        {posted ? (
          <CancelStockMove
            noun="adjustment"
            effect={
              adding
                ? `The stock it added comes out of ${adjustment.godownName} again. The number is cancelled for good.`
                : `The stock goes back into ${adjustment.godownName} at the cost it left at. The number is cancelled for good.`
            }
            blocked={
              adjustment.usedSince ? "Some of the stock this added has been sold or moved since, so it cannot be cancelled. Take it out with a new adjustment." : undefined
            }
            onCancel={async (reason) => {
              await cancelAdjustment(adjustment.id, reason);
              await onChanged();
            }}
          />
        ) : (
          <p className="text-sm font-semibold text-danger-strong">
            Cancelled {adjustment.cancelledAt ? formatDate(adjustment.cancelledAt.slice(0, 10)) : ""}: {adjustment.cancelReason}.{" "}
            {adding ? "The stock it added came out again." : "The stock went back."}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
