"use client";

import { useState } from "react";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { formatPercent, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { marginPct, RATE_SOURCE_TEXT, rateFor, type PricingBook } from "./rate-rules";

// "What rate does this customer get?", worked out from the same rules a
// quotation uses, with the reason shown.
export function RateCheckCard({ items, customers, book }: { items: Item[]; customers: Party[]; book: PricingBook }) {
  const today = useToday();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const item = items.find((candidate) => candidate.id === itemId);
  const customer = customers.find((candidate) => candidate.id === customerId);
  const result = item && today ? rateFor(item, customer, Number(quantity) || 0, today, book) : undefined;

  return (
    <GlassCard className="flex flex-col gap-3">
      <CardTitle>Check a rate</CardTitle>
      <SelectField label="Customer" options={customers.map((party) => ({ value: party.id, label: party.displayName }))} value={customerId} onValueChange={setCustomerId} />
      <SelectField label="Item" options={items.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={itemId} onValueChange={setItemId} />
      <TextField label="Quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      {result && item && (
        <div className="glass-inset flex flex-col gap-1.5 rounded-(--radius-tile) px-4 py-3">
          <span className="text-xl font-semibold tabular-nums">{formatRate(result.rate)}</span>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip tone={result.source === "minimum" ? "warning" : result.source === "standard" ? "neutral" : "brand"}>{RATE_SOURCE_TEXT[result.source]}</StatusChip>
            {result.slab && <StatusChip tone="success">Slab −{result.slab.discountPct}% from {result.slab.minQuantity}</StatusChip>}
          </div>
          <p className="text-xs font-semibold text-muted">
            {result.special
              ? `Special rate till ${result.special.validTill}.`
              : result.level
                ? `${result.level.name}: ${result.level.discountPct}% off MRP.`
                : "No price level or special rate for this customer."}{" "}
            Margin {formatPercent(marginPct(result.rate, item.costPrice))}.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
