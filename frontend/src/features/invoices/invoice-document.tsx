import { describeComponents, type TaxDecision } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";
import type { Party } from "@/features/parties/types";
import { amountInWords } from "@/lib/amount-in-words";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { documentType } from "./dispatch-documents";
import { exportDeclaration, hsnSummary, invoiceTotals, lineTotals, needsEinvoice } from "./invoice-rules";
import type { DispatchDocumentKind, Invoice } from "./types";

export interface Issuer {
  legalName: string;
  address: string;
  phone: string;
  email: string;
  stateCode: string;
  gstin?: string;
  iec?: string;
}

interface InvoiceDocumentProps {
  invoice: Invoice;
  party: Party;
  issuer: Issuer;
  tax: TaxDecision;
}

// The printed bill: white paper, not glass, with every particular CGST rule 46
// asks for. Export invoices swap the buyer's GSTIN for the destination country
// and carry the LUT or IGST declaration. Printed through `.print-area`.
export function InvoiceDocument({ invoice, party, issuer, tax }: InvoiceDocumentProps) {
  const isExport = invoice.kind === "export";
  const totals = invoiceTotals(invoice.lines, tax.regime);
  const summary = hsnSummary(invoice.lines, tax.regime);
  const references: DispatchDocumentKind[] = ["customs-invoice", "lorry-challan", "eway-bill", "shipping-bill", "leo"];
  const shipTo = invoice.shipTo ?? party.billing;
  const einvoice = invoice.documents["e-invoice"];

  return (
    <article className="print-area rounded-[18px] bg-white p-6 text-[12px] leading-snug text-ink shadow-[0_10px_40px_rgb(20_40_90/0.12)] sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-3">
        <div>
          <p className="text-lg font-extrabold">{issuer.legalName}</p>
          <p>{issuer.address}</p>
          <p>{issuer.phone} · {issuer.email}</p>
          <p className="font-bold">
            GSTIN {issuer.gstin ?? "[to be added]"} · State {stateName(issuer.stateCode)} ({issuer.stateCode})
            {isExport && ` · IEC ${issuer.iec || "[to be added]"}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold tracking-wide">{isExport ? "EXPORT INVOICE" : "TAX INVOICE"}</p>
          <p className="text-[11px] font-bold text-muted">Original for recipient</p>
        </div>
      </header>

      {isExport && (
        <p className="mt-3 border border-ink px-3 py-2 text-center text-[11px] font-extrabold">{exportDeclaration(invoice)}</p>
      )}

      {needsEinvoice(invoice, party) && (
        <section className="mt-3 flex items-start gap-3 border border-line p-2.5 text-[11px]">
          <div className="flex size-[84px] shrink-0 items-center justify-center border border-dashed border-ink/40 p-1 text-center text-[9px] font-bold text-muted">
            {einvoice ? "Signed QR from the e-invoice portal" : "QR after e-invoice registration"}
          </div>
          {einvoice ? (
            <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-2">
              <dt className="font-bold text-muted">IRN</dt>
              <dd className="break-all">{einvoice.number}</dd>
              <dt className="font-bold text-muted">Ack. no.</dt>
              <dd>{einvoice.details.ackNo}</dd>
              <dt className="font-bold text-muted">Ack. date</dt>
              <dd>{formatDate(einvoice.date)}</dd>
            </dl>
          ) : (
            <p className="font-bold text-muted">E-invoice not registered yet: the IRN and QR code print here once it is.</p>
          )}
        </section>
      )}

      <section className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="font-bold text-muted">Bill to</p>
          <p className="font-extrabold">{party.legalName ?? party.displayName}</p>
          <p>{[party.billing.line1, party.billing.city, party.billing.pin].filter(Boolean).join(", ")}</p>
          <p>{party.billing.country ?? stateName(party.billing.stateCode)}</p>
          {party.gstin && <p className="font-bold">GSTIN {party.gstin}</p>}
          {party.foreignTaxId && <p className="font-bold">Tax ID {party.foreignTaxId}</p>}
        </div>
        <div>
          <p className="font-bold text-muted">{isExport ? "Consignee / deliver to" : "Ship to"}</p>
          <p>{[shipTo.line1, shipTo.city].filter(Boolean).join(", ")}</p>
          <p>{shipTo.country ?? stateName(shipTo.stateCode)}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3">
          <dt className="font-bold text-muted">Invoice no.</dt>
          <dd className="font-extrabold">{invoice.number}</dd>
          <dt className="font-bold text-muted">Date</dt>
          <dd>{formatDate(invoice.date)}</dd>
          {isExport ? (
            <>
              <dt className="font-bold text-muted">Destination</dt>
              <dd>{invoice.destinationCountry}</dd>
              <dt className="font-bold text-muted">Currency</dt>
              <dd>{invoice.currency}</dd>
            </>
          ) : (
            <>
              <dt className="font-bold text-muted">Place of supply</dt>
              <dd>
                {stateName(invoice.placeOfSupply)} ({invoice.placeOfSupply})
              </dd>
              <dt className="font-bold text-muted">Reverse charge</dt>
              <dd>No</dd>
            </>
          )}
          {invoice.vehicleNumber && (
            <>
              <dt className="font-bold text-muted">Vehicle</dt>
              <dd>{invoice.vehicleNumber}</dd>
            </>
          )}
        </dl>
      </section>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-right tabular-nums">
          <thead>
            <tr className="border-y border-ink text-[11px]">
              <th className="py-1.5 text-left">#</th>
              <th className="py-1.5 text-left">Description</th>
              <th className="py-1.5 text-left">HSN</th>
              <th className="py-1.5">Qty</th>
              <th className="py-1.5">Rate</th>
              <th className="py-1.5">Disc.</th>
              <th className="py-1.5">Taxable</th>
              <th className="py-1.5">GST</th>
              <th className="py-1.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => {
              const totalsForLine = lineTotals(line, tax.regime);
              return (
                <tr key={`${line.itemId}-${index}`} className="border-b border-line align-top">
                  <td className="py-1.5 text-left">{index + 1}</td>
                  <td className="py-1.5 text-left font-semibold">{line.description}</td>
                  <td className="py-1.5 text-left">{line.hsn}</td>
                  <td className="py-1.5">
                    {formatQuantity(line.quantity)} {line.unit}
                  </td>
                  <td className="py-1.5">{formatRate(line.rate)}</td>
                  <td className="py-1.5">{line.discountPct ? `${line.discountPct}%` : "—"}</td>
                  <td className="py-1.5">{formatRate(totalsForLine.taxable)}</td>
                  <td className="py-1.5 whitespace-nowrap">{describeComponents(line.gstRatePct, tax.regime)}</td>
                  <td className="py-1.5 font-semibold">{formatRate(totalsForLine.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-3 grid gap-4 sm:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-2">
          {summary.length > 0 && (
            <table className="w-full max-w-[420px] border-collapse text-right text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-ink">
                  <th className="py-1 text-left">HSN</th>
                  <th className="py-1">Rate</th>
                  <th className="py-1">Taxable</th>
                  <th className="py-1">Tax</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.hsn}-${row.ratePct}`}>
                    <td className="py-0.5 text-left">{row.hsn}</td>
                    <td className="py-0.5">{tax.regime === "export-lut" ? "0% (LUT)" : `${row.ratePct}%`}</td>
                    <td className="py-0.5">{formatRate(row.taxable)}</td>
                    <td className="py-0.5">{formatRate(row.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <span className="font-bold">Amount in words: </span>
            {amountInWords(totals.grandTotal, invoice.currency)}
          </p>
          {invoice.notes && <p>{invoice.notes}</p>}
        </div>
        <dl className="flex flex-col gap-0.5 tabular-nums">
          <div className="flex justify-between">
            <dt>Taxable value</dt>
            <dd>{formatRate(totals.taxable)}</dd>
          </div>
          {Object.entries(totals.taxByName).map(([name, amount]) => (
            <div key={name} className="flex justify-between">
              <dt>{name}</dt>
              <dd>{formatRate(amount ?? 0)}</dd>
            </div>
          ))}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between">
              <dt>Round off</dt>
              <dd>{formatRate(totals.roundOff)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t-2 border-ink pt-1 text-[14px] font-extrabold">
            <dt>Total ({invoice.currency})</dt>
            <dd>{formatRate(totals.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      {references.some((kind) => invoice.documents[kind]) && (
        <section className="mt-3 border-t border-line pt-2 text-[11px]">
          <span className="font-bold">References: </span>
          {references
            .filter((kind) => invoice.documents[kind])
            .map((kind) => `${documentType(kind).name} ${invoice.documents[kind]!.number}`)
            .join(" · ")}
        </section>
      )}

      {isExport && (
        <p className="mt-3 text-[11px] font-bold">Payment: please quote invoice number {invoice.number} in the payment remarks.</p>
      )}

      <footer className="mt-8 flex items-end justify-between gap-4 text-[11px]">
        <p className="max-w-[60%] text-muted">Certified that the particulars given above are true and correct. Subject to Jaigaon jurisdiction.</p>
        <div className="text-right">
          <p className="font-bold">For {issuer.legalName}</p>
          <p className="mt-8 border-t border-ink pt-1">Authorised signatory</p>
        </div>
      </footer>
    </article>
  );
}
