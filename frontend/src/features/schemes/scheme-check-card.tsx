"use client";

import { useState } from "react";
import useSWR from "swr";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { SchemeRateSource } from "@/types/scheme";
import { EVALUATE_SCHEMES_PATH, fetchSchemeResult } from "./schemes-api";
import { RATE_SOURCE_OPTIONS } from "./scheme-text";

const WALK_IN = "walk-in";

// "What would this customer get?": one line through the same rules a
// quotation uses (POST /schemes/evaluate), to check a scheme before relying
// on it.
export function SchemeCheckCard({ items, customers }: { items: SelectOption[]; customers: SelectOption[] }) {
  const today = useToday();
  const [partyId, setPartyId] = useState(WALK_IN);
  const [itemId, setItemId] = useState<string>();
  const [quantity, setQuantity] = useState("100");
  const [rate, setRate] = useState("");
  const [rateSource, setRateSource] = useState<SchemeRateSource>("SHEET");
  const [date, setDate] = useState<string>();
  const day = date ?? today ?? undefined;

  const ready = itemId && day && Number(quantity) > 0 && Number(rate) > 0;
  const lines = ready ? JSON.stringify([{ key: "check", itemId, quantity: Number(quantity), rate: Number(rate), discountPct: 0, rateSource }]) : undefined;
  const { data, error } = useSWR(lines && day ? ([EVALUATE_SCHEMES_PATH, partyId === WALK_IN ? undefined : partyId, day, lines] as const) : null, fetchSchemeResult, {
    keepPreviousData: true,
  });
  const line = data?.lines[0];

  return (
    <GlassCard className="flex flex-col gap-3">
      <CardTitle>Scheme check</CardTitle>
      <SelectField label="Customer" options={[{ value: WALK_IN, label: "Walk-in buyer" }, ...customers]} value={partyId} onValueChange={setPartyId} />
      <SelectField label="Item" options={items} value={itemId} onValueChange={setItemId} />
      <div className="grid grid-cols-2 gap-2.5">
        <TextField label="Quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        <TextField label="Rate (₹)" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <SelectField label="Rate is" options={RATE_SOURCE_OPTIONS} value={rateSource} onValueChange={(value) => setRateSource(value as SchemeRateSource)} />
        <TextField label="Date" type="date" value={day ?? ""} onChange={(event) => setDate(event.target.value)} />
      </div>
      {error && <p className="text-xs font-semibold text-danger-strong">{error instanceof Error ? error.message : "Could not check"}</p>}
      {!ready && <p className="text-xs font-semibold text-muted">Pick an item and enter a rate to see what the schemes give.</p>}
      {ready && line && (
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <div className="flex justify-between">
            <dt>Line value</dt>
            <dd className="tabular-nums">{formatRate(line.gross)}</dd>
          </div>
          {line.applied.map((applied) => (
            <div key={applied.schemeId} className="flex justify-between gap-2 text-success-strong">
              <dt className="min-w-0 truncate">{applied.name}</dt>
              <dd className="tabular-nums">{applied.freeQuantity ? `+${formatQuantity(applied.freeQuantity)} free` : `− ${formatRate(applied.amount)}`}</dd>
            </div>
          ))}
          {line.applied.length === 0 && <p className="text-xs text-muted">No scheme applies.</p>}
          <div className="my-0.5 border-t border-line" />
          <div className="flex justify-between">
            <dt>Charged before GST</dt>
            <dd className="tabular-nums">{formatRate(line.taxable)}</dd>
          </div>
          <div className="flex justify-between text-xs text-muted">
            <dt>Works out per unit</dt>
            <dd className="tabular-nums">{formatRate(line.taxable / Number(quantity))}</dd>
          </div>
        </dl>
      )}
      <p className="text-xs font-semibold text-muted">Order schemes count this line alone here; a quotation counts all its lines.</p>
    </GlassCard>
  );
}
