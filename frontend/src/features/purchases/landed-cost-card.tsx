"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import type { Item } from "@/features/items/types";
import { formatInr, formatQuantity, formatRate } from "@/lib/format";
import type { BillView } from "./bill-view";
import { allocateLandedCost, chargeHeadLabel, LANDED_COST_METHODS, lineWeightKg } from "./purchase-rules";
import type { BillLine, LandedCostMethod } from "./types";

interface LandedCostCardProps {
  goods: BillView;
  /** Freight, unloading and labour bills tagged to this purchase. */
  tagged: BillView[];
  items: Item[];
  method: LandedCostMethod;
  onMethodChange: (method: LandedCostMethod) => void;
}

// What each item really cost once freight, unloading and labour are spread
// over it. Tally cannot do this (27 Oct 2026 walkthrough); stock is valued
// at the landed rate.
export function LandedCostCard({ goods, tagged, items, method, onMethodChange }: LandedCostCardProps) {
  const onBill = goods.totals.chargesValue;
  const charges = onBill + tagged.reduce((sum, view) => sum + view.totals.cost, 0);
  const weightOf = (line: BillLine) => lineWeightKg(line, items.find((item) => item.id === line.itemId));
  const rows = allocateLandedCost(goods.bill.lines, goods.split, charges, method, weightOf);
  const basisUnit = method === "weight" ? "kg" : method === "value" ? "₹" : "qty";

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>Landed cost</CardTitle>
        <span className="ml-auto text-sm font-semibold tabular-nums">{formatInr(charges)} to spread</span>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {onBill > 0 && (
          <li className="glass-inset flex flex-wrap justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
            <span className="font-semibold">
              On this bill: {goods.bill.charges.map((charge) => chargeHeadLabel(charge.head).toLowerCase()).join(", ")}
            </span>
            <span className="font-semibold tabular-nums">{formatInr(onBill)}</span>
          </li>
        )}
        {tagged.map((view) => (
          <li key={view.bill.id} className="glass-inset flex flex-wrap justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
            <span>
              <Link href={`/purchases/${view.bill.id}`} className="font-semibold text-brand hover:underline">
                {view.bill.reference}
              </Link>{" "}
              <span className="font-semibold text-ink-soft">
                · {view.vendor.displayName} · {view.bill.charges.map((charge) => chargeHeadLabel(charge.head).toLowerCase()).join(", ")}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{formatInr(view.totals.cost)}</span>
          </li>
        ))}
        {charges === 0 && (
          <li className="text-sm font-semibold text-muted">No freight, loading or labour on this purchase yet. Each item costs what the bill says.</li>
        )}
      </ul>
      {tagged.some((view) => view.totals.itcClaimable > 0) && (
        <p className="-mt-1 text-xs font-semibold text-muted">GST on these bills is claimed back as input credit, so only the value before GST lands on the items.</p>
      )}

      <FilterGroup label="Spread by">
        {LANDED_COST_METHODS.map((option) => (
          <FilterChip key={option.value} selected={method === option.value} onClick={() => onMethodChange(option.value)}>
            {option.label}
          </FilterChip>
        ))}
      </FilterGroup>
      <p className="-mt-1 text-xs font-semibold text-muted">{LANDED_COST_METHODS.find((option) => option.value === method)?.hint}.</p>

      {rows ? (
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Item</th>
              <th scope="col">Quantity</th>
              <th scope="col">Share basis ({basisUnit})</th>
              <th scope="col">Bill cost</th>
              <th scope="col">Charges</th>
              <th scope="col">Landed cost</th>
              <th scope="col">Rate: bill → landed</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {rows.map((row) => (
              <tr key={row.line.itemId}>
                <td className="text-left font-semibold">{row.line.description}</td>
                <td>
                  {formatQuantity(row.line.quantity)} {row.line.unit}
                </td>
                <td>{method === "value" ? formatInr(row.basis) : formatQuantity(Math.round(row.basis * 100) / 100)}</td>
                <td>{formatInr(row.ownCost)}</td>
                <td>{formatInr(row.share)}</td>
                <td className="font-semibold">{formatInr(row.landedCost)}</td>
                <td>
                  {formatRate(row.line.rate)} → <span className="font-semibold text-ink">{formatRate(row.landedRate)}</span>
                  <div className="text-xs text-muted">per {row.line.unit}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      ) : (
        <p className="rounded-(--radius-tile) bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
          Some items have no weight per unit. Add it on the item, or spread by value or quantity.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Link href={`/purchases/new?kind=charges&for=${goods.bill.id}`} className={buttonClasses("outline")}>
          <Plus aria-hidden="true" className="size-[18px]" />
          Add a freight, unloading or labour bill
        </Link>
        <p className="text-xs font-semibold text-muted">Changing the method here is not saved until bills are connected to the database.</p>
      </div>
    </GlassCard>
  );
}
