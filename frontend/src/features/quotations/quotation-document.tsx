import type { TaxDecision } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";
import type { InvoiceTotals } from "@/features/invoices/invoice-rules";
import { lineTotals } from "@/features/invoices/invoice-rules";
import type { Issuer } from "@/features/invoices/invoice-document";
import type { Party } from "@/features/parties/types";
import { amountInWords } from "@/lib/amount-in-words";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { quotationLabel } from "./quotation-rules";
import type { Quotation } from "./types";

interface QuotationDocumentProps {
  quotation: Quotation;
  party: Party;
  issuer: Issuer;
  tax: TaxDecision;
  totals: InvoiceTotals;
}

// The quotation as the customer sees it, on white paper like the invoice.
// Margin and cost never print. Printed through `.print-area`.
export function QuotationDocument({ quotation, party, issuer, tax, totals }: QuotationDocumentProps) {
  return (
    <article className="print-area rounded-(--radius-tile) bg-white p-6 text-[12px] leading-snug text-ink shadow-[0_10px_40px_rgb(20_40_90/0.12)] sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3.5 border-b-2 border-ink pb-3">
        <div>
          <p className="text-lg font-semibold">{issuer.legalName}</p>
          <p>{issuer.address}</p>
          <p>
            {issuer.phone} · {issuer.email}
          </p>
          <p className="font-semibold">{issuer.registration === "UNREGISTERED" ? "Not registered under GST" : `GSTIN ${issuer.gstin ?? "[to be added]"}`}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-wide">QUOTATION</p>
          <p className="font-semibold">{quotationLabel(quotation)}</p>
          <p>Date {formatDate(quotation.date)}</p>
          <p className="font-semibold">Valid till {formatDate(quotation.validUntil)}</p>
        </div>
      </header>

      <section className="mt-3">
        <p className="text-[11px] font-semibold text-muted">To</p>
        <p className="font-semibold">{party.legalName ?? party.displayName}</p>
        <p>{[party.billing.line1, party.billing.city, party.billing.stateCode ? stateName(party.billing.stateCode) : party.billing.country].filter(Boolean).join(", ")}</p>
        {party.gstin && <p>GSTIN {party.gstin}</p>}
      </section>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-ink text-[11px]">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Item</th>
            <th className="py-1.5 pr-2">HSN</th>
            <th className="py-1.5 pr-2 text-right">Qty</th>
            <th className="py-1.5 pr-2 text-right">Rate</th>
            <th className="py-1.5 pr-2 text-right">Disc.</th>
            <th className="py-1.5 pr-2 text-right">GST</th>
            <th className="py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {quotation.lines.map((line, index) => {
            const saved = quotation.stored?.lines[index];
            return (
            <tr key={index} className="border-b border-ink/15">
              <td className="py-1.5 pr-2">{index + 1}</td>
              <td className="py-1.5 pr-2 font-semibold">
                {line.description}
                {saved && saved.freeQuantity > 0 && (
                  <span className="block text-[11px] font-normal">
                    + {formatQuantity(saved.freeQuantity)} {saved.unit} free under the scheme
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-2">{line.hsn}</td>
              <td className="py-1.5 pr-2 text-right">
                {formatQuantity(line.quantity)} {line.unit}
              </td>
              <td className="py-1.5 pr-2 text-right">{formatRate(line.rate)}</td>
              <td className="py-1.5 pr-2 text-right">{line.discountPct ? `${line.discountPct}%` : "–"}</td>
              <td className="py-1.5 pr-2 text-right">{line.gstRatePct}%</td>
              <td className="py-1.5 text-right">{formatRate(lineTotals(line, "no-gst").taxable)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap justify-between gap-3.5">
        <div className="max-w-md whitespace-pre-line">
          <p className="text-[11px] font-semibold text-muted">Terms</p>
          <p>{quotation.terms}</p>
          {quotation.notes && <p className="mt-2 font-semibold">{quotation.notes}</p>}
        </div>
        <dl className="min-w-[220px] tabular-nums">
          {quotation.stored && quotation.stored.totals.schemeDiscount > 0 && (
            <>
              <div className="flex justify-between gap-3.5">
                <dt>Items</dt>
                <dd>{formatRate(quotation.stored.totals.gross)}</dd>
              </div>
              {schemeNames(quotation.stored).map((scheme) => (
                <div key={scheme.name} className="flex justify-between gap-3.5">
                  <dt>Less {scheme.name}</dt>
                  <dd>− {formatRate(scheme.amount)}</dd>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between gap-3.5">
            <dt>Value before GST</dt>
            <dd>{formatRate(totals.taxable)}</dd>
          </div>
          {Object.entries(totals.taxByName).map(([name, amount]) => (
            <div key={name} className="flex justify-between gap-3.5">
              <dt>{name}</dt>
              <dd>{formatRate(amount ?? 0)}</dd>
            </div>
          ))}
          {Object.keys(totals.taxByName).length === 0 && (
            <div className="flex justify-between gap-3.5">
              <dt>GST</dt>
              <dd>{tax.regime === "export-lut" ? "Nil, under LUT" : "Nil"}</dd>
            </div>
          )}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between gap-3.5">
              <dt>Round off</dt>
              <dd>{formatRate(totals.roundOff)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between gap-3.5 border-t border-ink pt-1 text-[14px] font-semibold">
            <dt>Total</dt>
            <dd>{formatRate(totals.grandTotal)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-2 font-semibold">{amountInWords(totals.grandTotal, party.currency)}</p>
      <p className="mt-6 text-right font-semibold">For {issuer.legalName}</p>
    </article>
  );
}

/** Each scheme's rupees over the whole quotation, for the printed totals. */
function schemeNames(stored: NonNullable<Quotation["stored"]>) {
  const totals = new Map<string, number>();
  for (const line of stored.lines) {
    for (const applied of line.schemes) if (applied.amount) totals.set(applied.name, Math.round(((totals.get(applied.name) ?? 0) + applied.amount) * 100) / 100);
  }
  return [...totals].map(([name, amount]) => ({ name, amount }));
}
