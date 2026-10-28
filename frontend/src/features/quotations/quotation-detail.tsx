"use client";

import { Printer, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import type { Issuer } from "@/features/invoices/invoice-document";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { addDays } from "@/lib/dates";
import { formatDate, formatInr, formatPercent } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { QuotationDocument } from "./quotation-document";
import { quotationFigures, quotationLabel, quotationStage } from "./quotation-rules";
import { STAGE_TONE } from "./quotations-workspace";
import type { Quotation, QuotationStatus } from "./types";

interface QuotationDetailProps {
  initialQuotation: Quotation;
  party: Party;
  issuer: Issuer;
  items: Item[];
}

// One quotation: the printable copy, where it stands, revisions, and the step
// to an invoice. Status changes stay on the page until quotations are saved.
export function QuotationDetail({ initialQuotation, party, issuer, items }: QuotationDetailProps) {
  const today = useToday();
  const [quotation, setQuotation] = useState(initialQuotation);
  const [revising, setRevising] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const { tax, totals, profit } = quotationFigures(quotation, party, issuer.stateCode, items);
  const stage = quotationStage(quotation, today);
  const invoiceKind = party.treatment === "overseas" || party.treatment === "sez" ? "export" : "local";

  const setStatus = (status: QuotationStatus, text: string) => {
    setQuotation((current) => ({ ...current, status, sentOn: status === "sent" ? (today ?? current.date) : current.sentOn }));
    setNotice(`${text} on this page. It is not saved to the database yet.`);
  };

  const revise = () => {
    setQuotation((current) => ({
      ...current,
      revision: current.revision + 1,
      status: "draft",
      date: today ?? current.date,
      validUntil: addDays(today ?? current.date, 7),
      history: [...current.history, { revision: current.revision, date: current.date, total: totals.grandTotal, note: revisionNote || "Revised" }],
    }));
    setRevising(false);
    setRevisionNote("");
    setNotice("A new revision is open as a draft. Change rates on the copy below once editing is connected.");
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
              <span className={profit.marginPct < 8 ? "text-danger-strong" : undefined}>{formatPercent(profit.marginPct)}</span>
            </FactTile>
            <FactTile label="Valid till">{formatDate(quotation.validUntil)}</FactTile>
            <FactTile label="Tax">{tax.title}</FactTile>
          </dl>
          <p className="text-xs font-semibold text-muted">
            {party.displayName}
            {quotation.sentOn && ` · sent ${formatDate(quotation.sentOn)}`}
          </p>

          {quotation.status === "converted" && quotation.invoiceId ? (
            <Link href={`/invoices/${quotation.invoiceId}`} className={buttonClasses("success")}>
              Open the invoice
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              {quotation.status === "draft" && <Button onClick={() => setStatus("sent", "Marked as sent")}>Mark as sent</Button>}
              {(quotation.status === "sent" || stage === "Expired") && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="success" className="flex-1" onClick={() => setStatus("accepted", "Marked as accepted")}>
                    Accepted
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => setStatus("rejected", "Marked as lost")}>
                    Lost
                  </Button>
                </div>
              )}
              {quotation.status !== "rejected" && (
                <Link href={`/invoices/new/${invoiceKind}?quotation=${quotation.id}`} className={buttonClasses(quotation.status === "accepted" ? "success" : "outline")}>
                  Convert to {invoiceKind === "export" ? "an export" : "a local"} invoice
                </Link>
              )}
              <Button variant="neutral" onClick={() => setRevising(true)}>
                Revise
              </Button>
            </div>
          )}
          {notice && <FormMessage tone="success">{notice}</FormMessage>}
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

      <GlassModal
        open={revising}
        onOpenChange={setRevising}
        title={`Revise ${quotationLabel(quotation)}`}
        description="The current version is kept with its total; the new one starts as a draft valid for a week."
        footer={
          <>
            <Button variant="neutral" onClick={() => setRevising(false)}>
              Cancel
            </Button>
            <Button onClick={revise}>Start revision R{quotation.revision + 1}</Button>
          </>
        }
      >
        <TextField label="Why it is being revised" placeholder="Customer asked for a better TMT rate" value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} />
      </GlassModal>
    </div>
  );
}
