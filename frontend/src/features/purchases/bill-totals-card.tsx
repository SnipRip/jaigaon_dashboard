import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import type { TaxDecision } from "@/features/gst/gst-rules";
import { formatRate } from "@/lib/format";
import type { BillTotals } from "./purchase-rules";

interface BillTotalsCardProps {
  totals: BillTotals;
  tax: TaxDecision;
}

// Running totals of a vendor bill: what we owe the vendor, the GST on it,
// how much of that comes back as input credit, and what stays as cost.
export function BillTotalsCard({ totals, tax }: BillTotalsCardProps) {
  const row = (label: string, value: number, className = "text-sm font-semibold") => (
    <div className={`flex justify-between gap-3 ${className}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatRate(value)}</dd>
    </div>
  );
  const taxes = Object.entries(totals.taxByName);

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Totals</CardTitle>
        <StatusChip tone={tax.itc ? "brand" : "warning"}>{tax.title}</StatusChip>
      </div>
      <dl className="flex flex-col gap-1.5">
        {totals.goodsValue > 0 && row("Goods", totals.goodsValue)}
        {totals.chargesValue > 0 && row("Freight, loading and labour", totals.chargesValue)}
        {row("Taxable value", totals.taxable, "text-sm font-bold")}
        {!totals.reverseCharge && taxes.map(([name, amount]) => <div key={name}>{row(name, amount ?? 0)}</div>)}
        {taxes.length === 0 && (
          <div className="flex justify-between text-sm font-semibold text-muted">
            <dt>GST</dt>
            <dd>None on this bill</dd>
          </div>
        )}
        {totals.roundOff !== 0 && row("Round off", totals.roundOff)}
        <div className="my-1 border-t border-line" />
        {row("To pay the vendor", totals.payable, "text-lg font-extrabold")}
      </dl>

      {totals.reverseCharge && totals.tax > 0 && (
        <div className="glass-inset flex flex-col gap-1 rounded-[18px] px-4 py-3">
          <p className="text-xs font-bold text-muted">Reverse charge: we pay this GST to the government</p>
          <dl className="flex flex-col gap-1">{taxes.map(([name, amount]) => <div key={name}>{row(name, amount ?? 0)}</div>)}</dl>
          <p className="text-xs font-semibold text-ink-soft">Paid in cash with the return, then claimed back as input credit the next month.</p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <div className="glass-inset rounded-[18px] p-3">
          <dt className="text-xs font-bold text-muted">Input credit</dt>
          <dd className="font-extrabold text-success-strong tabular-nums">{formatRate(totals.itcClaimable)}</dd>
        </div>
        <div className="glass-inset rounded-[18px] p-3">
          <dt className="text-xs font-bold text-muted">Cost to us</dt>
          <dd className="font-extrabold tabular-nums">{formatRate(totals.cost)}</dd>
        </div>
      </dl>
      {totals.itcLost > 0 && (
        <p className="text-xs font-semibold text-warning-strong">{formatRate(totals.itcLost)} of GST cannot be claimed, so it is added to cost.</p>
      )}
      <p className="text-xs font-semibold text-muted">{tax.detail}</p>
    </GlassCard>
  );
}
