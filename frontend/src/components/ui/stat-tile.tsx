import clsx from "clsx";
import { GlassCard } from "./glass-card";
import { STATUS_TEXT, type StatusTone } from "./status-chip";

interface StatTileProps {
  label: string;
  value: string;
  /** Colours the figure, e.g. warning when something needs attention. */
  tone?: StatusTone;
}

/** One figure in the row of tiles at the top of a list page. */
export function StatTile({ label, value, tone }: StatTileProps) {
  return (
    <GlassCard className="flex flex-col gap-0.5 py-3 sm:px-4">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className={clsx("text-xl font-semibold tabular-nums", tone && STATUS_TEXT[tone])}>{value}</span>
    </GlassCard>
  );
}
