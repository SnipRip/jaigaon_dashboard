"use client";

import Link from "next/link";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import type { VariantRow } from "./item-group-schema";
import type { Item } from "./types";

export interface VariantLine {
  key: string;
  values: Record<string, string>;
  name: string;
  row: VariantRow;
  /** The item this variant already is, when editing a saved group. */
  existing?: Item;
  errors?: Partial<Record<keyof VariantRow, string>>;
}

interface VariantRowsTableProps {
  lines: VariantLine[];
  unit: string;
  onChange: (key: string, field: keyof VariantRow, value: string) => void;
}

const cellInput =
  "glass-field h-10 w-full min-w-0 px-3 text-right text-[13px] font-bold tabular-nums aria-[invalid=true]:border-danger";

// The variants an item group generates, one row each, with the fields that
// differ between variants. Each row becomes an item on save.
export function VariantRowsTable({ lines, unit, onChange }: VariantRowsTableProps) {
  if (lines.length === 0) {
    return (
      <p className="glass-inset rounded-[18px] px-4 py-6 text-center text-sm font-semibold text-muted">
        Add an attribute and its options above. A variant is made for every combination.
      </p>
    );
  }

  const input = (line: VariantLine, field: keyof VariantRow, label: string, align: "left" | "right" = "right") => (
    <input
      aria-label={`${label}, ${line.name}`}
      inputMode={field === "sku" ? "text" : "decimal"}
      value={line.row[field]}
      onChange={(event) => onChange(line.key, field, event.target.value)}
      aria-invalid={line.errors?.[field] ? true : undefined}
      className={align === "left" ? `${cellInput} text-left` : cellInput}
    />
  );

  return (
    <GlassTable className="min-w-[860px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">Variant</th>
          <th scope="col" className="w-[170px] text-left">SKU</th>
          <th scope="col" className="w-[120px]">Cost (₹)</th>
          <th scope="col" className="w-[120px]">Selling (₹)</th>
          <th scope="col" className="w-[130px]">Opening stock</th>
          <th scope="col" className="w-[120px]">Reorder at</th>
        </tr>
      </thead>
      <tbody className="font-semibold tabular-nums">
        {lines.map((line) => {
          const firstError = Object.values(line.errors ?? {})[0];
          return (
            <tr key={line.key} className="align-top">
              <td className="text-left">
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {line.existing ? (
                    <Link href={`/items/${line.existing.id}`} className="font-bold hover:text-brand hover:underline">
                      {Object.values(line.values).join(" · ")}
                    </Link>
                  ) : (
                    <span className="font-bold">{Object.values(line.values).join(" · ")}</span>
                  )}
                  {!line.existing && <StatusChip tone="brand">New</StatusChip>}
                </div>
                <div className="text-xs text-muted">{line.name}</div>
                {firstError && <div className="text-xs font-bold text-danger-strong">{firstError}</div>}
              </td>
              <td>{input(line, "sku", "SKU", "left")}</td>
              <td>{input(line, "costPrice", "Cost")}</td>
              <td>{input(line, "sellingPrice", "Selling price")}</td>
              <td className="text-right">
                {line.existing ? (
                  <div className="pt-2.5 text-[13px]">
                    {formatQuantity(line.existing.stock)} {unit}
                    <div className="text-[11px] text-muted">in stock</div>
                  </div>
                ) : (
                  input(line, "openingStock", "Opening stock")
                )}
              </td>
              <td>{input(line, "reorderLevel", "Reorder level")}</td>
            </tr>
          );
        })}
      </tbody>
    </GlassTable>
  );
}
