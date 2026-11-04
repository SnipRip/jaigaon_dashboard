"use client";

import { useState } from "react";
import useSWR from "swr";
import { FormMessage } from "@/components/ui/form-message";
import { GlassModal } from "@/components/ui/glass-modal";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet, saveErrorText } from "@/lib/api-client";
import { formatDate, formatDateTime, formatRate } from "@/lib/format";
import type { ItemPriceView, PriceSheetRowView } from "@/types/price-list";
import { deletePrice, itemPricesPath, setPriceArchived } from "./price-list-api";

interface PriceHistoryDialogProps {
  row: PriceSheetRowView | null;
  /** The date the table shows: the entry in force then is marked. */
  date: string;
  onClose: () => void;
  onChanged: () => void;
}

const datesOf = (entry: ItemPriceView) =>
  entry.validFrom === entry.validTill ? `${formatDate(entry.validFrom)} only` : `${formatDate(entry.validFrom)} – ${formatDate(entry.validTill)}`;

const linkButton = "text-xs font-semibold text-brand hover:underline disabled:opacity-50";

// Every price an item has had on the price list, newest start first, with
// who set it. An entry can be withdrawn (archived: its days fall back to the
// next entry, else have no rate) or deleted.
export function PriceHistoryDialog({ row, date, onClose, onChanged }: PriceHistoryDialogProps) {
  const { data, error, mutate } = useSWR<ItemPriceView[]>(row ? itemPricesPath(row.itemId) : null, apiGet);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setProblem(null);
    try {
      await work();
      await mutate();
      onChanged();
    } catch (failure) {
      setProblem(saveErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassModal
      open={row !== null}
      onOpenChange={(open) => !open && onClose()}
      title={row ? `Price history of ${row.name}` : "Price history"}
      description={row ? "Days with no entry have no rate: quotations ask for one." : undefined}
    >
      {!data ? (
        <LoadNotice error={error} what="price history" />
      ) : data.length === 0 ? (
        <p className="text-[13px] text-muted">No rate-sheet prices yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {data.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-semibold">{datesOf(entry)}</span>
                <span className="text-xs text-muted">
                  {entry.updatedBy ?? "Someone"} · {formatDateTime(entry.updatedAt)}
                  {entry.notes && ` · ${entry.notes}`}
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {entry.id === row?.entry?.id && <StatusChip tone="brand">In force {formatDate(date)}</StatusChip>}
                  {entry.isArchived && <StatusChip tone="neutral">Withdrawn</StatusChip>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[13px] font-semibold tabular-nums">{formatRate(entry.sellingPrice)}</span>
                <div className="flex gap-2.5">
                    <button type="button" disabled={busy} className={linkButton} onClick={() => void act(() => setPriceArchived(entry.id, !entry.isArchived))}>
                      {entry.isArchived ? "Restore" : "Withdraw"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={`${linkButton} text-danger`}
                      onClick={() => {
                        if (window.confirm(`Delete the price for ${datesOf(entry)}? This cannot be undone.`)) void act(() => deletePrice(entry.id));
                      }}
                    >
                      Delete
                    </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {problem && <FormMessage tone="error">{problem}</FormMessage>}
    </GlassModal>
  );
}
