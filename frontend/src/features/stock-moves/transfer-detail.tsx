"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import type { StockTransferView } from "@/types/stock-moves";
import { CancelStockMove } from "./cancel-stock-move";
import { StockDrawsList } from "./stock-draws-list";
import { STATUS_TEXT } from "./stock-move-rules";
import { cancelTransfer } from "./stock-moves-api";

// One stock transfer: what moved, and which batches it came out of at what
// cost (the same cost it carries in the other godown).
export function TransferDetail({ transfer, onChanged }: { transfer: StockTransferView; onChanged: () => Promise<void> }) {
  const posted = transfer.status === "POSTED";
  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{transfer.number}</CardTitle>
            <StatusChip tone={STATUS_TEXT[transfer.status].tone}>{STATUS_TEXT[transfer.status].label}</StatusChip>
            <Link href="/stock-transfers" className={buttonClasses("neutral", "ml-auto")}>
              Back to transfers
            </Link>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FactTile label="Date">{formatDate(transfer.date)}</FactTile>
            <FactTile label="From">{transfer.fromGodownName}</FactTile>
            <FactTile label="To">{transfer.toGodownName}</FactTile>
            <FactTile label="Vehicle">{transfer.vehicleNumber ?? "Not given"}</FactTile>
          </dl>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Items moved</CardTitle>
          <GlassTable className="min-w-[640px]">
            <thead>
              <tr className="text-right">
                <th scope="col" className="text-left">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col" className="text-left">Taken from</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody className="text-right font-semibold tabular-nums">
              {transfer.lines.map((line) => (
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
                  <td className="text-left text-xs">
                    <StockDrawsList draws={line.draws} unit={line.unit} empty="Put back on cancel" />
                  </td>
                  <td>{formatRate(line.value)}</td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <FactTile label="Value moved">{formatInr(transfer.value)}</FactTile>
          <FactTile label="Entered by">{transfer.createdBy ?? "–"}</FactTile>
        </dl>
        {transfer.notes && <p className="text-sm font-semibold text-muted">{transfer.notes}</p>}
        {posted ? (
          <CancelStockMove
            noun="transfer"
            effect={`The stock comes out of ${transfer.toGodownName} and goes back to ${transfer.fromGodownName}. The number is cancelled for good.`}
            blocked={
              transfer.usedAtDestination
                ? `Some of this stock has been sold or moved on from ${transfer.toGodownName}, so the transfer cannot be cancelled. Move it back with a new transfer.`
                : undefined
            }
            onCancel={async (reason) => {
              await cancelTransfer(transfer.id, reason);
              await onChanged();
            }}
          />
        ) : (
          <p className="text-sm font-semibold text-danger-strong">
            Cancelled {transfer.cancelledAt ? formatDate(transfer.cancelledAt.slice(0, 10)) : ""}: {transfer.cancelReason}. The stock went back to {transfer.fromGodownName}.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
