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
import { TextField } from "@/components/ui/text-field";
import type { Party } from "@/features/parties/types";
import { profitOf } from "@/features/profit/profit-rules";
import { RATE_SOURCE_TEXT } from "@/features/rates/line-rate-options";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr, formatPercent, formatQuantity, formatRate } from "@/lib/format";
import { DispatchDocumentsPanel } from "./dispatch-documents-panel";
import { InvoiceDocument, type Issuer } from "./invoice-document";
import { invoiceStage, invoiceTax, invoiceTotals, needsEinvoice } from "./invoice-rules";
import { InvoiceStageChip } from "./invoice-stage-chip";
import { cancelInvoice } from "./invoices-api";
import type { Invoice } from "./types";

interface InvoiceDetailProps {
  initialInvoice: Invoice;
  party: Party;
  issuer: Issuer;
  /** After a cancel is saved: reload the invoices and the items' stock. */
  onChanged: () => Promise<void>;
}

// One invoice: the printable bill on the left; on the right its stage, what
// it cost (the stock it drew, oldest first) and the documents that follow it.
// Attached documents stay on this page only: they are not stored yet.
export function InvoiceDetail({ initialInvoice, party, issuer, onChanged }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const tax = invoiceTax(issuer.stateCode, invoice, party);
  const totals = invoiceTotals(invoice.lines, tax.regime);
  const stage = invoiceStage(invoice);
  const stored = invoice.stored;
  const profit = stored ? profitOf(stored.totals.taxable, stored.totals.cost, 0) : undefined;

  const cancel = async () => {
    if (reason.trim().length < 2) {
      setNotice({ tone: "error", text: "Say why it is cancelled." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await cancelInvoice(invoice.id, reason.trim());
      await onChanged();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_400px]">
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
          <Link href="/invoices" className={buttonClasses("neutral", "ml-auto")}>
            Back to invoices
          </Link>
        </div>
        <p className="-mt-2 text-xs font-semibold text-muted">WhatsApp sending switches on when the WhatsApp Business API is connected.</p>
        <InvoiceDocument invoice={invoice} party={party} issuer={issuer} tax={tax} />
        {stored && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Stock drawn and what it cost</CardTitle>
            <p className="-mt-1.5 text-xs font-semibold text-muted">
              Oldest stock first from {stored.godownName}. Cost is each batch&rsquo;s landed rate (freight and unloading included); it follows if a bill is landed again.
            </p>
            <GlassTable className="min-w-[640px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">Item</th>
                  <th scope="col" className="text-left">Rate from</th>
                  <th scope="col" className="text-left">Taken from</th>
                  <th scope="col">Charged</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Margin</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                {stored.lines.map((line) => {
                  const margin = line.taxable === 0 ? undefined : ((line.taxable - line.costOfGoods) / line.taxable) * 100;
                  return (
                    <tr key={line.id} className="align-top">
                      <td className="text-left">
                        {line.description}
                        <div className="text-xs text-muted">
                          {formatQuantity(line.quantity)} {line.unit}
                          {line.freeQuantity > 0 && ` + ${formatQuantity(line.freeQuantity)} free`}
                        </div>
                      </td>
                      <td className="text-left">
                        <StatusChip tone={line.rateSource === "MANUAL" ? "warning" : "brand"}>{RATE_SOURCE_TEXT[line.rateSource]}</StatusChip>
                      </td>
                      <td className="text-left text-xs">
                        {line.draws.length === 0 ? (
                          <span className="text-muted">Put back on cancel</span>
                        ) : (
                          line.draws.map((draw, index) => (
                            <div key={index}>
                              {formatQuantity(draw.quantity)} {line.unit} ·{" "}
                              {draw.billId ? (
                                <Link href={`/purchases/${draw.billId}`} className="text-brand hover:underline">
                                  {draw.billReference}
                                </Link>
                              ) : (
                                "Opening stock"
                              )}{" "}
                              @ {formatRate(draw.rate)}
                            </div>
                          ))
                        )}
                      </td>
                      <td>{formatRate(line.taxable)}</td>
                      <td>{line.draws.length ? formatRate(line.costOfGoods) : "–"}</td>
                      <td className={margin !== undefined && margin < 8 ? "text-danger-strong" : undefined}>
                        {margin === undefined || !line.draws.length ? "–" : formatPercent(margin)}
                      </td>
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
            <CardTitle>{invoice.number}</CardTitle>
            <InvoiceStageChip stage={stage} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <FactTile label="Total">{formatInr(totals.grandTotal)}</FactTile>
            <FactTile label="Tax">{tax.title}</FactTile>
            {stored && profit && stored.status === "ISSUED" && (
              <>
                <FactTile label="Cost of goods">{formatInr(stored.totals.cost)}</FactTile>
                <FactTile label="Margin">
                  <span className={profit.marginPct < 8 ? "text-danger-strong" : undefined}>{formatPercent(profit.marginPct)}</span>
                </FactTile>
              </>
            )}
          </dl>
          <p className="text-xs font-semibold text-muted">
            {party.displayName} · {invoice.kind === "export" ? `Export to ${invoice.destinationCountry ?? "abroad"}` : "Local sale"}
            {stored?.quotation && (
              <>
                {" · from "}
                <Link href={`/quotations/${stored.quotation.id}`} className="text-brand hover:underline">
                  {stored.quotation.label}
                </Link>
              </>
            )}
          </p>
          {stored?.status === "CANCELLED" && (
            <p className="text-sm font-semibold text-danger-strong">
              Cancelled {stored.cancelledAt ? formatDate(stored.cancelledAt.slice(0, 10)) : ""}: {stored.cancelReason}. Its stock went back and its number stays cancelled.
            </p>
          )}
          {invoice.status === "issued" && (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/payments/receipts/new?invoice=${invoice.id}`} className={buttonClasses("success")}>
                Record receipt
              </Link>
              <Link href={`/payments/ledger/${party.id}`} className="text-xs font-semibold text-brand hover:underline">
                {party.displayName}&rsquo;s ledger
              </Link>
            </div>
          )}
          {invoice.status === "issued" &&
            (cancelling ? (
              <div className="flex flex-col gap-2">
                <TextField label="Why it is cancelled" placeholder="Wrong customer billed" value={reason} onChange={(event) => setReason(event.target.value)} />
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" disabled={busy} onClick={() => void cancel()}>
                    {busy ? "Cancelling…" : "Cancel invoice"}
                  </Button>
                  <Button variant="neutral" disabled={busy} onClick={() => setCancelling(false)}>
                    Keep it
                  </Button>
                </div>
                <p className="text-xs font-semibold text-muted">The goods go back into stock and the number is cancelled for good.</p>
              </div>
            ) : (
              <Button variant="neutral" onClick={() => setCancelling(true)}>
                Cancel this invoice
              </Button>
            ))}
          {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
        </GlassCard>

        {invoice.status === "issued" && (
          <>
            <DispatchDocumentsPanel
              invoice={invoice}
              grandTotal={totals.grandTotal}
              einvoice={needsEinvoice(invoice, party)}
              onChange={(kind, document) => setInvoice((current) => ({ ...current, documents: { ...current.documents, [kind]: document } }))}
            />
            <p className="px-2 text-xs font-semibold text-muted">Attached documents stay on this page only for now: storing them comes next.</p>
          </>
        )}
      </div>
    </div>
  );
}
