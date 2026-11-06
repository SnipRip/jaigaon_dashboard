import { FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatInr, formatPercent, formatRate } from "@/lib/format";
import { draftTotals, lineValue, type DraftLine } from "./enquiry-rules";
import { QuantityStepper } from "./quantity-stepper";

interface QuotationDraftProps {
  /** Undefined = walk-in: the quotation form asks for the customer. */
  customerId?: string;
  customerName: string;
  lines: DraftLine[];
  onQuantityChange: (itemId: string, quantity: number) => void;
}

// The quotation being built. Totals are live. "Continue as a quotation"
// carries the customer and lines to the quotation form (SKU:quantity in the
// address); WhatsApp sending waits for the WhatsApp Business API.
export function QuotationDraft({ customerId, customerName, lines, onQuantityChange }: QuotationDraftProps) {
  const totals = draftTotals(lines);
  const carried = lines.filter((line) => line.quantity > 0);
  const params = new URLSearchParams({ lines: carried.map((line) => `${line.item.sku}:${line.quantity}`).join(",") });
  if (customerId) params.set("customer", customerId);
  const continueHref = `/quotations/new?${params}`;

  return (
    <GlassCard aria-label="Quotation draft" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">New quotation</h2>
          <span className="text-xs font-semibold text-muted">{customerName}</span>
        </div>
        <StatusChip tone="neutral">Draft</StatusChip>
      </div>

      {lines.length === 0 ? (
        <p className="border-y border-line py-6 text-center text-[13px] text-muted">
          Add products from the list to start a quotation.
        </p>
      ) : (
        <ul className="flex flex-col border-b border-line">
          {lines.map((line) => {
            const inputId = `qty-${line.item.itemId}`;
            const { rate } = line.item.options;
            return (
              <li key={line.item.itemId} className="flex flex-col gap-2 border-t border-line py-3">
                <div className="flex justify-between gap-2.5 text-[13px] font-semibold">
                  <span>{line.item.name}</span>
                  <span className="tabular-nums">{rate !== null ? formatInr(lineValue(line)) : "Rate on quotation"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <label htmlFor={inputId} className="sr-only">
                    Quantity, {line.item.name}
                  </label>
                  <QuantityStepper
                    id={inputId}
                    itemName={line.item.name}
                    value={line.quantity}
                    onChange={(quantity) => onQuantityChange(line.item.itemId, quantity)}
                  />
                  {line.item.unit}
                  {rate !== null && <> × {formatRate(rate)}</>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="flex flex-col gap-2 text-[13px] font-semibold tabular-nums">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted">Quotation value</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatInr(totals.value)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Estimated profit</dt>
          <dd className="font-semibold text-success-strong">
            {formatInr(totals.profit)} · {formatPercent(totals.marginPct)}
          </dd>
        </div>
        {(totals.unpriced > 0 || !totals.costKnown) && (
          <p className="text-xs font-semibold text-muted">
            {[
              totals.unpriced > 0 && `${totals.unpriced} line${totals.unpriced === 1 ? " has" : "s have"} no rate today: type it on the quotation.`,
              !totals.costKnown && "Profit leaves out items with no cost yet.",
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Taxes</dt>
          <dd>As applicable on invoice</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2.5">
        <Link
          href={continueHref}
          aria-disabled={carried.length === 0}
          className={buttonClasses("primary", carried.length === 0 ? "pointer-events-none opacity-55" : undefined, "lg")}
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
