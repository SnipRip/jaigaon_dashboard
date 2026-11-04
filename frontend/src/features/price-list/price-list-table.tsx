"use client";

import clsx from "clsx";
import { History } from "lucide-react";
import type { KeyboardEvent } from "react";
import { GlassTable } from "@/components/ui/glass-table";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import { formatDayMonth, formatPercent } from "@/lib/format";
import type { PriceSheetRowView } from "@/types/price-list";
import { type EditField, type RowEdit, type RowFigures } from "./price-edits";
import { marginTone } from "./price-list-rules";

export interface TableRow {
  row: PriceSheetRowView;
  edit?: RowEdit;
  figures: RowFigures;
}

interface PriceListTableProps {
  rows: TableRow[];
  selected: Set<string>;
  onSelect: (itemIds: string[], selected: boolean) => void;
  onChange: (itemId: string, field: EditField, text: string) => void;
  onHistory: (row: PriceSheetRowView) => void;
}

const cellInput =
  "glass-field h-8 w-[88px] px-2 text-right text-[13px] tabular-nums text-ink placeholder:text-muted";

/** "4 Nov" or "4–10 Nov" for an entry's dates. */
const datesOf = ({ validFrom, validTill }: { validFrom: string; validTill: string }) =>
  validFrom === validTill ? `${formatDayMonth(validFrom)} only` : `${formatDayMonth(validFrom)} – ${formatDayMonth(validTill)}`;

/** Enter moves to the same column one row down, so a day's prices can be typed in one go. */
function moveDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const { column, index } = event.currentTarget.dataset;
  const next = document.querySelector<HTMLInputElement>(`input[data-column="${column}"][data-index="${Number(index) + 1}"]`);
  next?.focus();
  next?.select();
}

// The price list for one date: every item with the price in force, its cost
// and margin, all editable in place. Changes stay on the page until saved.
export function PriceListTable({ rows, selected, onSelect, onChange, onHistory }: PriceListTableProps) {
  const allSelected = rows.length > 0 && rows.every(({ row }) => selected.has(row.itemId));

  const input = (index: number, { row, edit }: TableRow, field: EditField, value: string, label: string, placeholder?: string) => (
    <input
      aria-label={`${label} of ${row.name}`}
      inputMode="decimal"
      data-column={field}
      data-index={index}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(row.itemId, field, event.target.value)}
      onKeyDown={moveDown}
      onFocus={(event) => event.currentTarget.select()}
      className={clsx(cellInput, edit?.[field] !== undefined && "border-brand bg-brand/5")}
    />
  );

  return (
    <GlassTable className="min-w-[1080px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="w-8 text-left">
            <input
              type="checkbox"
              aria-label="Select every row shown"
              checked={allSelected}
              onChange={(event) => onSelect(rows.map(({ row }) => row.itemId), event.target.checked)}
              className="size-4 accent-brand"
            />
          </th>
          <th scope="col" className="text-left">Item</th>
          <th scope="col">Cost</th>
          <th scope="col">Price</th>
          <th scope="col">Margin %</th>
          <th scope="col">MRP</th>
          <th scope="col">Minimum</th>
          <th scope="col" className="text-left">Price from</th>
          <th scope="col">
            <span className="sr-only">History</span>
          </th>
        </tr>
      </thead>
      <tbody className="text-right tabular-nums">
        {rows.map((tableRow, index) => {
          const { row, edit, figures } = tableRow;
          const changed = edit !== undefined;
          return (
            <tr key={row.itemId} className={clsx(changed && "bg-brand/[0.035]")}>
              <td className="text-left">
                <input
                  type="checkbox"
                  aria-label={`Select ${row.name}`}
                  checked={selected.has(row.itemId)}
                  onChange={(event) => onSelect([row.itemId], event.target.checked)}
                  className="size-4 accent-brand"
                />
              </td>
              <td className="max-w-[260px] text-left">
                <div className="truncate font-semibold" title={row.name}>
                  {row.name}
                </div>
                <div className="text-xs text-muted">
                  {row.sku}
                  {row.unit && ` · per ${row.unit}`}
                </div>
              </td>
              <td>{input(index, tableRow, "cost", edit?.cost ?? (figures.cost === null ? "" : String(figures.cost)), "Cost", row.item.costPrice === null ? "No stock" : String(row.item.costPrice))}</td>
              <td>{input(index, tableRow, "price", edit?.price ?? (figures.price === null ? "" : String(figures.price)), "Price", "No price")}</td>
              <td>
                <div className="flex items-center justify-end gap-1">
                  {input(index, tableRow, "margin", edit?.margin ?? (figures.margin === null ? "" : String(figures.margin)), "Margin %")}
                  {figures.margin === null ? (
                    <span className="w-12 text-left text-xs font-semibold text-muted">–</span>
                  ) : (
                    <span className={clsx("w-12 text-left text-xs font-semibold", STATUS_TEXT[marginTone(figures.margin)])}>{formatPercent(figures.margin)}</span>
                  )}
                </div>
              </td>
              <td>{input(index, tableRow, "mrp", edit?.mrp ?? (figures.mrp === null ? "" : String(figures.mrp)), "MRP", row.item.mrp === null ? "–" : String(row.item.mrp))}</td>
              <td>{input(index, tableRow, "min", edit?.min ?? (figures.min === null ? "" : String(figures.min)), "Minimum price", "None")}</td>
              <td className="text-left text-xs">
                {figures.problem ? (
                  <span className={clsx("font-semibold", STATUS_TEXT.danger)}>{figures.problem}</span>
                ) : changed ? (
                  <span className="font-semibold text-brand">Not saved</span>
                ) : row.entry ? (
                  <span className="font-semibold text-ink">
                    Price list · {datesOf(row.entry)}
                    {row.overridden > 0 && <span className="block font-medium text-muted">overrides {row.overridden} other</span>}
                  </span>
                ) : (
                  <span className="text-muted">Item master</span>
                )}
              </td>
              <td>
                <button
                  type="button"
                  aria-label={`Price history of ${row.name}`}
                  onClick={() => onHistory(row)}
                  className="glass-control glass-press inline-flex size-8 items-center justify-center text-ink-soft hover:bg-white/80"
                >
                  <History aria-hidden="true" className="size-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </GlassTable>
  );
}
