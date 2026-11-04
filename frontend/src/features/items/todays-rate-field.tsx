"use client";

import useSWR from "swr";
import { TextField } from "@/components/ui/text-field";
import { marginPct } from "@/features/rates/rate-rules";
import { fetchLineOptions, LINE_OPTIONS_PATH } from "@/features/rates/rates-api";
import { formatDate, formatPercent, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";

// The item's rate today, read from the rate sheet (the item master has none
// of its own), with its margin on the last landed cost.
export function TodaysRateField({ itemId, unit }: { itemId: string; unit: string }) {
  const today = useToday();
  const { data } = useSWR(today ? ([LINE_OPTIONS_PATH, undefined, today, [itemId]] as const) : null, fetchLineOptions);
  const options = data?.[0];
  const rate = options?.todaysRate;
  const value = !options ? "…" : rate ? formatRate(rate.rate) : "No rate today";
  const hint = !options
    ? undefined
    : rate
      ? [
          rate.validFrom === rate.validTill ? `For ${formatDate(rate.validFrom)}` : `Till ${formatDate(rate.validTill)}`,
          options.marginCost !== null && `margin ${formatPercent(marginPct(rate.rate, options.marginCost))}`,
        ]
          .filter(Boolean)
          .join(", ")
      : options.previousSheetRate
        ? `Last ${formatRate(options.previousSheetRate.rate)} on ${formatDate(options.previousSheetRate.validTill)}`
        : "Not on the rate sheet yet";
  return <TextField label={`Today's rate per ${unit}`} value={value} hint={hint} disabled readOnly />;
}
