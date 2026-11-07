"use client";

import { Printer, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import type { Issuer } from "@/features/invoices/invoice-document";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { RATE_SOURCE_TEXT } from "@/features/rates/line-rate-options";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr, formatPercent, formatQuantity, formatRate } from "@/lib/format";
import type { QuotationStatusView } from "@/types/quotation";
import { useToday } from "@/lib/use-today";
import { QuotationDocument } from "./quotation-document";
import { quotationFigures, quotationLabel, quotationStage } from "./quotation-rules";
import { STAGE_TONE } from "./quotations-workspace";
import { setQuotationStatus } from "./quotations-api";
import type { Quotation } from "./types";

interface QuotationDetailProps {
  quotation: Quotation;
  party: Party;
  issuer: Issuer;
  items: Item[];
  /** After a status change is saved: reload the quotations. */
  onChanged: () => Promise<void>;
}

// One quotation: the printable copy, where it stands, how each line was
// priced (rate source, schemes, cost at the time), revisions, and the status
// steps. Changes are saved at once; a revision opens the form.
export function QuotationDetail({ quotation, party, issuer, items, onChanged }: QuotationDetailProps) {
  const today = useToday();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { tax, totals, profit, costKnown } = quotationFigures(quotation, party, issuer.stateCode, items);
  const stage = quotationStage(quotation, today);
  const stored = quotation.stored;
  const canRevise = quotation.status !== "accepted" && quotation.status !== "cancelled" && quotation.status !== "converted";

  const setStatus = async (status: QuotationStatusView, text: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await setQuotationStatus(quotation.id, status);
      await onChanged();
      setNotice({ tone: "success", text });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-[18px]" />
            Print or save as PDF
          </Button>
          <Button variant="success" disabled>
            <Send aria-hidden="true" className="size-[18px]" />
            Send on WhatsApp
          </Button>
          <Link href="/quotations" className={buttonClasses("neutral", "ml-auto")}>
            Back to quotations
          </Link>
        </div>
        <p className="-mt-2 text-xs font-semibold text-muted">WhatsApp sending switches on when the WhatsApp Business API is connected.</p>
        <QuotationDocument quotation={quotation} party={party} issuer={issuer} tax={tax} totals={totals} />
        {stored && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>How each line was priced</CardTitle>
            <GlassTable className="min-w-[640px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">Item</th>
                  <th scope="col" className="text-left">Rate from</th>
                  <th scope="col">Rate</th>
                  <th scope="col" className="text-left">Schemes</th>
                  <th scope="col">Charged</th>
                  <th scope="col">Cost then</th>
                  <th scope="col">Margin</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                {stored.lines.map((line) => {
                  const cost = line.costAtQuote === null ? undefined : line.costAtQuote * (line.quantity + line.freeQuantity);
                  const margin = cost === undefined || line.taxable === 0 ? undefined : ((line.taxable - cost) / line.taxable) * 100;
                  return (
                    <tr key={line.id}>
                      <td className="text-left">
                        {line.description}
                        <div className="text-xs text-muted">
                          {formatQuantity(line.entered.quantity)} {line.entered.unit}
                          {line.entered.factor !== 1 && ` (${formatQuantity(line.quantity)} ${line.unit})`}
                          {line.freeQuantity > 0 && ` + ${formatQuantity(line.freeQuantity)} ${line.unit} free`}
                        </div>
                      </td>
                      <td className="text-left">
                        <StatusChip tone={line.rateSource === "MANUAL" ? "warning" : "brand"}>{RATE_SOURCE_TEXT[line.rateSource]}</StatusChip>
                        {line.suggestedRate !== null && line.rateSource !== "SPECIAL" && line.rateSource !== "SHEET" && (
                          <div className="text-xs text-muted">offered {formatRate(line.suggestedRate)}</div>
                        )}
                      </td>
                      <td>
                        {formatRate(line.rate)}
                        {line.discountPct > 0 && <div className="text-xs text-muted">less {line.discountPct}%</div>}
                      </td>
                      <td className="text-left text-xs">
                        {line.schemes.length ? line.schemes.map((applied) => <div key={applied.schemeId}>{applied.name}{applied.amount ? `: − ${formatRate(applied.amount)}` : ""}</div>) : <span className="text-muted">None</span>}
                      </td>
                      <td>{formatRate(line.taxable)}</td>
                      <td>{cost === undefined ? <span className="text-muted">No stock</span> : formatRate(cost)}</td>
                      <td className={margin !== undefined && margin < 8 ? "text-danger-strong" : undefined}>{margin === undefined ? "–" : formatPercent(margin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </GlassTable>
          </GlassCard>
        )}
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{quotationLabel(quotation)}</CardTitle>
            <StatusChip tone={STAGE_TONE[stage]}>{stage}</StatusChip>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <FactTile label="Total">{formatInr(totals.grandTotal)}</FactTile>
            <FactTile label="Margin">
              {costKnown ? (
                <span className={profit.marginPct < 8 ? "text-danger-strong" : undefined}>{formatPercent(profit.marginPct)}</span>
              ) : (
                <span className="text-muted">Unknown: an item has no stock yet</span>
              )}
            </FactTile>
            <FactTile label="Valid till">{formatDate(quotation.validUntil)}</FactTile>
            <FactTile label="Tax">{tax.title}</FactTile>
          </dl>
          <p className="text-xs font-semibold text-muted">
            {party.displayName}
            {quotation.sentOn && ` · sent ${formatDate(quotation.sentOn)}`}
          </p>

          <div className="flex flex-col gap-2">
            {quotation.status === "draft" && (
              <Button disabled={busy} onClick={() => void setStatus("SENT", "Marked as given to the customer.")}>
                Mark as sent
              </Button>
            )}
            {quotation.status === "sent" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" className="flex-1" disabled={busy} onClick={() => void setStatus("ACCEPTED", "Marked as accepted.")}>
                  Accepted
                </Button>
                <Button variant="danger" className="flex-1" disabled={busy} onClick={() => void setStatus("REJECTED", "Marked as lost.")}>
                  Lost
                </Button>
              </div>
            )}
            {quotation.status === "rejected" && (
              <Button variant="neutral" disabled={busy} onClick={() => void setStatus("SENT", "Back with the customer.")}>
                Reopen
              </Button>
            )}
            {canRevise && (
              <Link href={`/quotations/${quotation.id}/revise`} className={buttonClasses("neutral")}>
                Revise to R{quotation.revision + 1}
              </Link>
            )}
            {quotation.status !== "cancelled" && quotation.status !== "converted" && (
              <Button variant="danger" disabled={busy} onClick={() => void setStatus("CANCELLED", "Cancelled. Its number stays cancelled in the register.")}>
                Cancel quotation
              </Button>
            )}
            {(quotation.status === "sent" || quotation.status === "accepted") && (
              <Link href={`/invoices/new/${tax.regime === "export-lut" || tax.regime === "export-igst" ? "export" : "local"}?quotation=${quotation.id}`} className={buttonClasses("success")}>
                Convert to invoice
              </Link>
            )}
            {quotation.status === "converted" && stored?.invoice && (
              <p className="text-sm font-semibold">
                Invoiced as{" "}
                <Link href={`/invoices/${stored.invoice.id}`} className="text-brand hover:underline">
                  {stored.invoice.number}
                </Link>
                . Cancelling that invoice brings this quotation back.
              </p>
            )}
          </div>
          {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}
        </GlassCard>

        {quotation.history.length > 0 && (
          <GlassCard className="flex flex-col gap-2">
            <CardTitle>Earlier revisions</CardTitle>
            <ul className="flex flex-col gap-1.5 text-sm">
              {quotation.history.map((entry) => (
                <li key={entry.revision} className="glass-inset flex flex-wrap justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
                  <span>
                    <span className="font-semibold">{entry.revision ? `R${entry.revision}` : "Original"}</span>
                    <span className="font-semibold text-ink-soft"> · {entry.note}</span>
                    <span className="block text-xs font-semibold text-muted">{formatDate(entry.date)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatInr(entry.total)}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

    </div>
  );
}
