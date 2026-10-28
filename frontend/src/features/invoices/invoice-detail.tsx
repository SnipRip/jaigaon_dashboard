"use client";

import { Printer, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import type { Party } from "@/features/parties/types";
import { formatInr } from "@/lib/format";
import { DispatchDocumentsPanel } from "./dispatch-documents-panel";
import { InvoiceDocument, type Issuer } from "./invoice-document";
import { invoiceStage, invoiceTax, invoiceTotals, needsEinvoice } from "./invoice-rules";
import { InvoiceStageChip } from "./invoice-stage-chip";
import type { Invoice } from "./types";

interface InvoiceDetailProps {
  initialInvoice: Invoice;
  party: Party;
  issuer: Issuer;
}

// One invoice: the printable bill on the left, its stage and the documents
// that follow it on the right. Attached documents stay on this page until
// invoices are connected to the database.
export function InvoiceDetail({ initialInvoice, party, issuer }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [notice, setNotice] = useState<string | null>(null);
  const tax = invoiceTax(issuer.stateCode, invoice, party);
  const totals = invoiceTotals(invoice.lines, tax.regime);
  const stage = invoiceStage(invoice);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
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
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-4">
        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{invoice.number}</CardTitle>
            <InvoiceStageChip stage={stage} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="glass-inset rounded-[18px] p-3">
              <dt className="text-xs font-bold text-muted">Total</dt>
              <dd className="font-extrabold tabular-nums">{formatInr(totals.grandTotal)}</dd>
            </div>
            <div className="glass-inset rounded-[18px] p-3">
              <dt className="text-xs font-bold text-muted">Tax</dt>
              <dd className="font-extrabold">{tax.title}</dd>
            </div>
          </dl>
          <p className="text-xs font-semibold text-muted">
            {party.displayName} · {invoice.kind === "export" ? `Export to ${invoice.destinationCountry}` : "Local sale"}
          </p>
          {invoice.status === "draft" && (
            <Button
              onClick={() => {
                setInvoice({ ...invoice, status: "issued" });
                setNotice("Issued on this page. It is not saved to the database yet.");
              }}
            >
              Issue this invoice
            </Button>
          )}
          {invoice.status === "issued" && (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/payments/receipts/new?invoice=${invoice.id}`} className={buttonClasses("success")}>
                Record receipt
              </Link>
              <Link href={`/payments/ledger/${party.id}`} className="text-xs font-bold text-brand hover:underline">
                {party.displayName}&rsquo;s ledger
              </Link>
            </div>
          )}
        </GlassCard>

        <DispatchDocumentsPanel
          invoice={invoice}
          grandTotal={totals.grandTotal}
          einvoice={needsEinvoice(invoice, party)}
          onChange={(kind, document) => {
            setInvoice((current) => ({ ...current, documents: { ...current.documents, [kind]: document } }));
            setNotice("Attached on this page. It is not saved to the database yet.");
          }}
        />
        {notice && <FormMessage tone="success">{notice}</FormMessage>}
      </div>
    </div>
  );
}
