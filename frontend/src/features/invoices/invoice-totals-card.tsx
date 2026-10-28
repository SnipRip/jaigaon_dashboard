import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import type { TaxDecision } from "@/features/gst/gst-rules";
import { amountInWords } from "@/lib/amount-in-words";
import { formatRate } from "@/lib/format";
import { EWAY_BILL_LIMIT, type InvoiceTotals } from "./invoice-rules";

interface InvoiceTotalsCardProps {
  totals: InvoiceTotals;
  tax: TaxDecision;
  currency: "INR" | "BTN";
}

// Running totals beside the invoice form: taxable value, each GST head, round
// off, grand total in figures and words, and whether an e-way bill is due.
export function InvoiceTotalsCard({ totals, tax, currency }: InvoiceTotalsCardProps) {
  const row = (label: string, value: number, strong = false) => (
    <div className={strong ? "flex justify-between text-lg font-extrabold" : "flex justify-between text-sm font-semibold"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatRate(value)}</dd>
    </div>
  );

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Totals</CardTitle>
        <StatusChip tone="brand">{tax.title}</StatusChip>
      </div>
      <dl className="flex flex-col gap-1.5">
        {row("Taxable value", totals.taxable)}
        {Object.entries(totals.taxByName).map(([name, amount]) => row(name, amount ?? 0))}
        {Object.keys(totals.taxByName).length === 0 && (
          <div className="flex justify-between text-sm font-semibold text-muted">
            <dt>GST</dt>
            <dd>{tax.regime === "export-lut" ? "0, under LUT" : "None"}</dd>
          </div>
        )}
        {totals.roundOff !== 0 && row("Round off", totals.roundOff)}
        <div className="my-1 border-t border-line" />
        {row("Invoice total", totals.grandTotal, true)}
      </dl>
      <p className="text-xs font-semibold text-ink-soft">{amountInWords(totals.grandTotal, currency)}</p>
      <p className="text-xs font-semibold text-muted">{tax.detail}</p>
      {totals.grandTotal > EWAY_BILL_LIMIT && (
        <StatusChip tone="warning">Above ₹50,000: an e-way bill is needed to move the goods</StatusChip>
      )}
    </GlassCard>
  );
}
