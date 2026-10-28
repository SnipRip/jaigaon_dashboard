import clsx from "clsx";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import { formatInr } from "@/lib/format";
import type { Kpi } from "./types";

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    // Columns follow the window, not the space left over: an auto-fit grid
    // would jump between three and four columns while the sidebar folds.
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 min-[1360px]:grid-cols-4">
      {kpis.map((kpi) => (
        <Link key={kpi.label} href={kpi.href} className="rounded-[26px]">
          <GlassCard aria-label={kpi.label} pointerLight interactive className="flex h-full flex-col gap-2">
            <span className="text-[13px] font-semibold text-muted">{kpi.label}</span>
            <span className="text-[32px] leading-none font-bold tracking-[-0.03em] tabular-nums">{formatInr(kpi.value)}</span>
            <span className={clsx("pt-1 text-xs font-semibold", kpi.noteTone === "neutral" ? "text-muted" : STATUS_TEXT[kpi.noteTone])}>{kpi.note}</span>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}
