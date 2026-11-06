"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";

import type { TradingSeries, TradingWeek } from "./types";

const SERIES: { key: TradingSeries; name: string; color: string }[] = [
  { key: "sales", name: "Sales", color: "var(--color-brand)" },
  { key: "purchase", name: "Purchase", color: "var(--color-brand-soft)" },
  { key: "profit", name: "Profit", color: "var(--color-success)" },
];

// Only the series the user's role may see (`shown`).
export function TradingChart({ data, shown }: { data: TradingWeek[]; shown: TradingSeries[] }) {
  return (
    <GlassCard className="flex flex-col gap-3.5">
      <CardTitle>Last {data.length} weeks · ₹ lakh</CardTitle>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 12, fontWeight: 600 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 12, fontWeight: 600 }} />
            <Tooltip cursor={{ fill: "rgb(255 255 255 / 0.4)", radius: 10 }} wrapperClassName="glass-popover !rounded-(--radius-tile) !border-0 !px-3.5 !py-2.5 text-[13px] font-semibold tabular-nums" />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-soft)" }} />
            {SERIES.filter((series) => shown.includes(series.key)).map((series) => (
              // Not animated: the bars would re-run their own 1.5s animation on every
              // frame the card is resized, and trail behind it when the sidebar folds.
              <Bar key={series.key} dataKey={series.key} name={series.name} fill={series.color} radius={[6, 6, 2, 2]} maxBarSize={22} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
