import { stateName } from "@/features/gst/indian-states";
import type { Issuer } from "@/features/invoices/invoice-document";
import { amountInWords } from "@/lib/amount-in-words";
import { formatDate, formatRate } from "@/lib/format";
import type { SettlementView } from "@/types/settlement";
import { modeText } from "./settlements-api";

// The printed receipt (money from a customer) or payment voucher (money to a
// vendor): white paper like the invoice, printed through `.print-area`. A
// cancelled one prints with CANCELLED across the top. A refund of advances
// (a payment to a customer, a receipt from a vendor) prints "Refund of
// advance" with each advance's number and date (CGST rule 51 asks a refund
// voucher to name the receipt voucher); an advance lists its live refunds.
export function SettlementVoucher({ settlement, issuer }: { settlement: SettlementView; issuer: Issuer }) {
  const receipt = settlement.direction === "RECEIPT";
  const cancelled = Boolean(settlement.cancelledAt);
  const total = settlement.amount + settlement.tds;
  // An advance applied later to the same invoice is one line on paper.
  const lines = [...settlement.allocations.reduce((byDocument, allocation) => {
    const key = `${allocation.kind}-${allocation.documentId}`;
    const label =
      allocation.kind === "OPENING" ? "Opening balance" : allocation.kind === "ADVANCE" && allocation.advanceDate ? `${allocation.number} dated ${formatDate(allocation.advanceDate)}` : allocation.number;
    const line = byDocument.get(key) ?? { label, amount: 0 };
    line.amount = Math.round((line.amount + allocation.amount) * 100) / 100;
    return byDocument.set(key, line);
  }, new Map<string, { label: string; amount: number }>()).values()];
  return (
    <article className="print-area rounded-(--radius-tile) bg-white p-6 text-[12px] leading-snug text-ink shadow-[0_10px_40px_rgb(20_40_90/0.12)] sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3.5 border-b-2 border-ink pb-3">
        <div>
          <p className="text-lg font-semibold">{issuer.legalName}</p>
          <p>{issuer.address}</p>
          <p>{issuer.phone} · {issuer.email}</p>
          <p className="font-semibold">
            {issuer.gstin && `GSTIN ${issuer.gstin} · `}State {stateName(issuer.stateCode)} ({issuer.stateCode})
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-wide">{receipt ? "RECEIPT" : "PAYMENT VOUCHER"}</p>
          {settlement.refund && <p className="text-[13px] font-semibold">Refund of advance</p>}
          {cancelled && <p className="text-[13px] font-semibold text-danger-strong">CANCELLED</p>}
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="flex gap-2">
          <dt className="font-semibold">No.</dt>
          <dd>{settlement.number}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold">Date</dt>
          <dd>{formatDate(settlement.date)}</dd>
        </div>
        <div className="col-span-2 flex gap-2">
          <dt className="font-semibold">{receipt ? "Received from" : "Paid to"}</dt>
          <dd>{settlement.partyName}</dd>
        </div>
        <div className="col-span-2 flex gap-2">
          <dt className="font-semibold">By</dt>
          <dd>
            {modeText(settlement.mode)} · {settlement.accountName}
            {settlement.reference && ` · ${settlement.reference}`}
          </dd>
        </div>
      </dl>

      <table className="mt-3 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-y border-ink text-left">
            <th className="py-1">{settlement.refund ? "Refund of advance on" : receipt ? "Against invoice" : "Against bill"}</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.label} className="border-b border-line">
              <td className="py-1">{line.label}</td>
              <td className="py-1 text-right">{formatRate(line.amount)}</td>
            </tr>
          ))}
          {settlement.refunds.map((refund) => (
            <tr key={refund.id} className="border-b border-line">
              <td className="py-1">
                Refunded by {refund.number} dated {formatDate(refund.date)}
              </td>
              <td className="py-1 text-right">{formatRate(refund.amount)}</td>
            </tr>
          ))}
          {settlement.unapplied > 0 && (
            <tr className="border-b border-line">
              <td className="py-1">Advance</td>
              <td className="py-1 text-right">{formatRate(settlement.unapplied)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <dl className="mt-3 ml-auto flex w-full max-w-[280px] flex-col gap-0.5 tabular-nums">
        {settlement.tds > 0 && (
          <>
            <div className="flex justify-between">
              <dt>Settled</dt>
              <dd>{formatRate(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>TDS deducted</dt>
              <dd>{formatRate(settlement.tds)}</dd>
            </div>
          </>
        )}
        <div className="mt-1 flex justify-between border-t-2 border-ink pt-1 text-[14px] font-semibold">
          <dt>{receipt ? "Received" : "Paid"}</dt>
          <dd>{formatRate(settlement.amount)}</dd>
        </div>
      </dl>
      <p className="mt-2">
        <span className="font-semibold">Amount in words: </span>
        {amountInWords(settlement.amount)}
      </p>
      {settlement.brc && (
        <p className="mt-1">
          BRC / e-BRC {settlement.brc.number} dated {formatDate(settlement.brc.date)}
        </p>
      )}

      <footer className="mt-10 flex items-end justify-between gap-3.5 text-[11px]">
        <p>{receipt ? "Received with thanks." : "Received the above payment."}</p>
        <div className="text-right">
          <p className="font-semibold">{receipt ? `For ${issuer.legalName}` : "Receiver's signature"}</p>
          <p className="mt-8 border-t border-ink pt-1">{receipt ? "Authorised signatory" : `For ${issuer.legalName}: authorised signatory`}</p>
        </div>
      </footer>
    </article>
  );
}
