import { FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatInr, formatPercent, formatRate } from "@/lib/format";
import { lineValue, quotationTotals } from "./pricing";
import { QuantityStepper } from "./quantity-stepper";
import type { QuotationLine } from "./types";

interface QuotationDraftProps {
  customerId: string;
  customerName: string;
  lines: QuotationLine[];
  onQuantityChange: (sku: string, quantity: number) => void;
}

// The quotation being built. Totals are live. "Continue as a quotation"
// carries the customer and lines to the quotation form (SKU:quantity in the
// address); WhatsApp sending waits for the WhatsApp Business API.
export function QuotationDraft({ customerId, customerName, lines, onQuantityChange }: QuotationDraftProps) {
  const totals = quotationTotals(lines);
  const carried = lines.filter((line) => line.quantity > 0);
  const continueHref = `/quotations/new?customer=${encodeURIComponent(customerId)}&lines=${encodeURIComponent(carried.map((line) => `${line.product.sku}:${line.quantity}`).join(","))}`;

  return (
    <GlassCard aria-label="Quotation draft" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-extrabold">New quotation</h2>
          <span className="text-xs font-semibold text-muted">{customerName}</span>
        </div>
        <StatusChip tone="neutral">Draft</StatusChip>
      </div>

      {lines.length === 0 ? (
        <p className="border-y border-line py-6 text-center text-sm font-semibold text-muted">
          Add products from the list to start a quotation.
        </p>
      ) : (
        <ul className="flex flex-col border-b border-line">
          {lines.map((line) => {
            const inputId = `qty-${line.product.sku}`;
            return (
              <li key={line.product.sku} className="flex flex-col gap-2 border-t border-line py-3">
                <div className="flex justify-between gap-2.5 text-[13px] font-extrabold">
                  <span>{line.product.name}</span>
                  <span className="tabular-nums">{formatInr(lineValue(line))}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <label htmlFor={inputId} className="sr-only">
                    Quantity, {line.product.name}
                  </label>
                  <QuantityStepper
                    id={inputId}
                    itemName={line.product.name}
                    value={line.quantity}
                    onChange={(quantity) => onQuantityChange(line.product.sku, quantity)}
                  />
                  {line.product.unit} × {formatRate(line.product.netRate)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="flex flex-col gap-2 text-[13px] font-semibold tabular-nums">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted">Quotation value</dt>
          <dd className="text-[22px] font-extrabold">{formatInr(totals.value)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Estimated profit</dt>
          <dd className="font-extrabold text-success-strong">
            {formatInr(totals.profit)} · {formatPercent(totals.marginPct)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Taxes</dt>
          <dd>As applicable on invoice</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2.5">
        <Link
          href={continueHref}
          aria-disabled={carried.length === 0}
          className={buttonClasses("primary", carried.length === 0 ? "pointer-events-none h-[50px] text-[15px] opacity-55" : "h-[50px] text-[15px]")}
        >
          <FileText aria-hidden="true" className="size-5" />
          Continue as a quotation
        </Link>
        <Button variant="success" disabled>
          <MessageCircle aria-hidden="true" className="size-5" />
          Send PDF on WhatsApp
        </Button>
      </div>
      <p className="text-xs font-semibold text-muted">
        The quotation form numbers, prints and saves it. WhatsApp sending switches on when the WhatsApp Business API is connected.
      </p>
    </GlassCard>
  );
}
