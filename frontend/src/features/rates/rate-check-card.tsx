"use client";

import { useState } from "react";
import useSWR from "swr";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { apiGet } from "@/lib/api-client";
import { formatDate, formatPercent, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { RateQuoteView } from "@/types/pricing";
import { marginPct, RATE_SOURCE_TEXT } from "./rate-rules";
import { quotePath } from "./rates-api";

const WALK_IN = "__walk-in";

// "What rate does this customer get?", worked out by the backend from the
// same rules a quotation uses (`GET /rates/quote`), with the reason shown.
export function RateCheckCard({ items, customers }: { items: Item[]; customers: Party[] }) {
  const today = useToday();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? WALK_IN);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && amount >= 0 && /^\d+(\.\d{1,3})?$/.test(quantity.trim());
  const path =
    itemId && today && valid
      ? quotePath({ itemId, partyId: customerId === WALK_IN ? undefined : customerId, quantity: amount, date: today })
      : null;
  const { data: quote, error } = useSWR<RateQuoteView>(path, apiGet, { keepPreviousData: true });

  return (
    <GlassCard className="flex flex-col gap-3">
      <CardTitle>Check a rate</CardTitle>
      <SelectField
        label="Customer"
        options={[{ value: WALK_IN, label: "Walk-in (no customer)" }, ...customers.map((party) => ({ value: party.id, label: party.displayName }))]}
        value={customerId}
        onValueChange={setCustomerId}
      />
      {items.length > 0 ? (
        <SelectField label="Item" options={items.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={itemId} onValueChange={setItemId} />
      ) : (
        <p className="text-[13px] text-muted">Add items first.</p>
      )}
      <TextField label="Quantity" inputMode="decimal" value={quantity} error={valid ? undefined : "Enter a quantity"} onChange={(event) => setQuantity(event.target.value)} />
      {error && <FormMessage tone="error">{error instanceof Error ? error.message : "Could not work out the rate."}</FormMessage>}
      {quote && path && (
        <div className="glass-inset flex flex-col gap-1.5 rounded-(--radius-tile) px-4 py-3">
          <span className="text-xl font-semibold tabular-nums">{formatRate(quote.rate)}</span>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip tone={quote.source === "minimum" ? "warning" : quote.source === "standard" ? "neutral" : "brand"}>{RATE_SOURCE_TEXT[quote.source]}</StatusChip>
            {quote.slab && (
              <StatusChip tone="success">
                Slab −{quote.slab.discountPct}% from {formatQuantity(quote.slab.minQuantity)}
              </StatusChip>
            )}
          </div>
          <p className="text-xs font-semibold text-muted">
            {quote.special
              ? `Special rate ${quote.special.validTill ? `till ${formatDate(quote.special.validTill)}` : "until withdrawn"}.`
              : quote.level
                ? `${quote.level.name}: ${quote.level.discountPct}% off MRP ${formatRate(quote.mrp ?? 0)}.`
                : "No price level or special rate applies: selling price."}{" "}
            Margin {formatPercent(marginPct(quote.rate, quote.costPrice))}.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
