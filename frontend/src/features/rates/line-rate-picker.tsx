"use client";

import clsx from "clsx";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import { formatDate, formatPercent, formatRate } from "@/lib/format";
import { lineMargin, type LineRateOptions, type RateChoiceKind } from "./line-rate-options";

const CHOICE_TEXT: Record<RateChoiceKind, string> = {
  special: "Special rate",
  today: "Today's rate",
  "last-quoted": "Last quoted",
  "last-sold": "Last sold",
};

/** Margin colours, as on the rate sheet: red under 8%, amber under 12%. */
const marginText = (margin: number) => STATUS_TEXT[margin < 8 ? "danger" : margin < 12 ? "warning" : "success"];

interface LineRatePickerProps {
  options: LineRateOptions;
  /** The line's rate after its discount; undefined while the rate is empty. */
  rate?: number;
  onPick: (rate: number) => void;
}

// The rates a line can take, one button each with its margin, under the
// line's rate field. Clicking one fills the rate; typing any other marks the
// line Manual. Going below the day's minimum is flagged, never blocked.
export function LineRatePicker({ options, rate, onPick }: LineRatePickerProps) {
  const { choices, floor, marginCost, previousSheetRate } = options;
  const picked = rate === undefined ? undefined : choices.find((choice) => choice.rate === rate);
  const margin = rate === undefined ? undefined : lineMargin(rate, marginCost);
  return (
    <div className="flex flex-col gap-1.5">
      {choices.length > 0 && (
        <div role="group" aria-label="Rates for this line" className="flex flex-wrap gap-1.5">
          {choices.map((choice) => {
            const choiceMargin = lineMargin(choice.rate, marginCost);
            const selected = picked?.kind === choice.kind;
            return (
              <button
                key={choice.kind}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(choice.rate)}
                className={clsx(
                  "glass-press flex min-w-[128px] flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition-colors",
                  selected ? "glass-selected border-brand/40" : "border-line bg-white/40 hover:bg-white/70",
                )}
              >
                <span className="text-[11px] font-semibold text-muted">{CHOICE_TEXT[choice.kind]}</span>
                <span className="flex items-baseline gap-1.5 text-[13px] font-semibold tabular-nums text-ink">
                  {formatRate(choice.rate)}
                  {choiceMargin !== undefined && <span className={clsx("text-[11px]", marginText(choiceMargin))}>{formatPercent(choiceMargin)}</span>}
                </span>
                <span className="text-[11px] text-muted">{choice.detail}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
        {rate !== undefined && !picked && <span className="text-ink-soft">Manual rate</span>}
        {margin !== undefined ? (
          <span className={marginText(margin)}>Margin {formatPercent(margin)}</span>
        ) : (
          rate !== undefined && <span>No stock yet, so no margin</span>
        )}
        {!options.suggested && !choices.some((choice) => choice.kind === "today") && (
          <span>
            Not on the rate sheet today
            {previousSheetRate ? `; last ${formatRate(previousSheetRate.rate)} till ${formatDate(previousSheetRate.validTill)}` : ""}. Type the rate.
          </span>
        )}
        {floor !== undefined && rate !== undefined && rate < floor && (
          <span className="w-full text-danger-strong">Below today&rsquo;s minimum of {formatRate(floor)}: needs approval.</span>
        )}
      </p>
    </div>
  );
}
