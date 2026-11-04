"use client";

import { useState } from "react";
import useSWR from "swr";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { formatDate, formatPercent, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { marginPct, RATE_SOURCE_TEXT } from "./rate-rules";
import { fetchLineOptions, LINE_OPTIONS_PATH } from "./rates-api";

const WALK_IN = "__walk-in";

const sheetDates = ({ validFrom, validTill }: { validFrom: string; validTill: string }) =>
  validFrom === validTill ? `for ${formatDate(validFrom)}` : `${formatDate(validFrom)} to ${formatDate(validTill)}`;

// "What rate does this customer get today?", worked out by the backend from
// the same rules a quotation line uses (POST /rates/line-options).
export function RateCheckCard({ items, customers }: { items: Item[]; customers: Party[] }) {
  const today = useToday();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? WALK_IN);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const partyId = customerId === WALK_IN ? undefined : customerId;
  const key = itemId && today ? ([LINE_OPTIONS_PATH, partyId, today, [itemId]] as const) : null;
  const { data, error } = useSWR(key, fetchLineOptions, { keepPreviousData: true });
  const options = data?.[0];

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
      {error && <FormMessage tone="error">{error instanceof Error ? error.message : "Could not work out the rate."}</FormMessage>}
      {options && key && (
        <div className="glass-inset flex flex-col gap-1.5 rounded-(--radius-tile) px-4 py-3">
          {options.rate === null ? (
            <span className="text-[15px] font-semibold">No rate today</span>
          ) : (
            <span className="text-xl font-semibold tabular-nums">{formatRate(options.rate)}</span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {options.source && <StatusChip tone="brand">{RATE_SOURCE_TEXT[options.source]}</StatusChip>}
            {options.rate !== null && options.marginCost !== null && (
              <StatusChip tone="neutral">Margin {formatPercent(marginPct(options.rate, options.marginCost))}</StatusChip>
            )}
          </div>
          <p className="text-xs font-semibold text-muted">
            {options.specialRate
              ? `Special rate ${options.specialRate.validTill ? `till ${formatDate(options.specialRate.validTill)}` : "until withdrawn"}${options.todaysRate ? `; today's rate is ${formatRate(options.todaysRate.rate)}` : ""}.`
              : options.todaysRate
                ? `Rate sheet ${sheetDates(options.todaysRate)}.`
                : options.previousSheetRate
                  ? `Nothing on the rate sheet today. Last sheet rate ${formatRate(options.previousSheetRate.rate)}, ${sheetDates(options.previousSheetRate)}.`
                  : "Nothing on the rate sheet for this item yet. The rate is typed on the quotation."}
            {options.floor !== null && ` Minimum ${formatRate(options.floor)}.`}
            {options.marginCost === null && " No stock yet, so no margin."}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
