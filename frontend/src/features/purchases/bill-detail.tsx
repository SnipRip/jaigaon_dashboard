"use client";

import { Ban, Paperclip, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { describeComponents, treatmentLabel } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";
import { lineTotals } from "@/features/invoices/invoice-rules";
import type { Item } from "@/features/items/types";
import { headName } from "@/features/masters/account-head-rules";
import { useAccountHeads } from "@/features/masters/use-account-heads";
import type { Party } from "@/features/parties/types";
import { modeText } from "@/features/payments/settlements-api";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { BillStatusChip } from "./bill-status-chip";
import { BillTotalsCard } from "./bill-totals-card";
import { viewBill } from "./bill-view";
import { LandedCostCard } from "./landed-cost-card";
import { billChargeRate, chargeBillsFor, ewayBillMissing, isMsme, MSME_PAYMENT_DAYS } from "./purchase-rules";
import { setBillAllocation, voidBill } from "./purchases-api";
import type { Bill, LandedCostMethod } from "./types";

interface BillDetailProps {
  bill: Bill;
  bills: Bill[];
  parties: Party[];
  items: Item[];
  companyState: string;
  /** After a change is saved: reload bills, orders and item costs. */
  onChanged: () => Promise<void>;
}

// One vendor bill as entered from the vendor's paper: its lines and the
// GST on each, input credit, what is left to pay, the e-way bill it came
// with and, for goods, the landed cost of each item.
export function BillDetail({ bill, bills, parties, items, companyState, onChanged }: BillDetailProps) {
  const today = useToday();
  const { heads } = useAccountHeads();
  // Until the heads load, a charge shows the name it was saved with.
  const chargeName = (ref: string) => headName(heads ?? [], ref);
  const [method, setMethod] = useState(bill.allocation);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const stored = bill.stored;
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      await onChanged();
      setNotice({ tone: "success", text: done });
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
      return false;
    } finally {
      setBusy(false);
    }
  };
  // The spread is saved at once: the stock batches take the new landed rates.
  const changeMethod = (next: LandedCostMethod) => {
    const before = method;
    setMethod(next);
    void act(() => setBillAllocation(bill.id, next), "Landed cost spread again and saved.").then((saved) => saved || setMethod(before));
  };
  const view = viewBill(bill, parties, companyState, today);
  const { vendor, tax, split, totals, status } = view;
  const balance = Math.max(totals.payable - bill.paid, 0);
  const payments = bill.stored?.payments ?? [];
  const tagged = chargeBillsFor(bills, bill.id).map((charges) => viewBill(charges, parties, companyState, today));
  const target = bill.landedCostFor ? bills.find((candidate) => candidate.id === bill.landedCostFor) : undefined;
  const chargeRate = bill.kind === "goods" ? billChargeRate(bill.lines) : undefined;

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{bill.reference}</CardTitle>
            <StatusChip tone="neutral">{bill.kind === "goods" ? "Goods bill" : "Freight, loading & labour"}</StatusChip>
            {bill.status === "void" && <StatusChip tone="danger">Void</StatusChip>}
            {stored?.purchaseOrderId && (
              <Link href={`/purchase-orders/${stored.purchaseOrderId}`} className="text-xs font-semibold text-brand hover:underline">
                Against {stored.purchaseOrderNumber}
              </Link>
            )}
            <Link href="/purchases" className={buttonClasses("neutral", "ml-auto")}>
              Back to bills
            </Link>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FactTile label="Vendor">
              <Link href={`/vendors/${vendor.id}`} className="font-semibold hover:text-brand hover:underline">
                {vendor.displayName}
              </Link>
              <span className="block text-xs font-semibold text-muted">{vendor.gstin ? `GSTIN ${vendor.gstin}` : treatmentLabel(vendor.treatment)}</span>
            </FactTile>
            <FactTile label="Vendor's bill">
              {bill.vendorBillNumber}
              <span className="block text-xs font-semibold text-muted">{formatDate(bill.date)}</span>
            </FactTile>
            <FactTile label="Source of supply">
              {stateName(bill.sourceOfSupply) ?? "Outside India"}
              {stored?.godownName && <span className="block text-xs font-semibold text-muted">Into {stored.godownName}</span>}
            </FactTile>
            <FactTile label="Due">
              {formatDate(bill.dueDate)}
              {isMsme(vendor) && <span className="block text-xs font-semibold text-muted">MSME: within {MSME_PAYMENT_DAYS} days</span>}
            </FactTile>
          </dl>
        </GlassCard>

        {bill.kind === "goods" && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Items</CardTitle>
            <GlassTable className="min-w-[760px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">Item</th>
                  <th scope="col" className="text-left">HSN</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Taxable</th>
                  <th scope="col" className="text-left">GST</th>
                  <th scope="col" className="text-left">Input credit</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                {bill.lines.map((line) => (
                  <tr key={line.itemId}>
                    <td className="text-left">
                      <Link href={`/items/${line.itemId}`} className="font-semibold hover:text-brand hover:underline">
                        {line.description}
                      </Link>
                    </td>
                    <td className="text-left">{line.hsn}</td>
                    <td>
                      {formatQuantity(line.quantity)} {line.unit}
                    </td>
                    <td>{formatRate(line.rate)}</td>
                    <td>{formatInr(lineTotals(line, split).taxable)}</td>
                    <td className="text-left text-xs">{describeComponents(line.gstRatePct, tax.regime)}</td>
                    <td className="text-left">
                      {!tax.itc ? (
                        <span className="text-xs text-muted">No GST bill</span>
                      ) : line.itc === "eligible" ? (
                        <StatusChip tone="success">Eligible</StatusChip>
                      ) : (
                        <StatusChip tone="warning">Not eligible, 17(5)</StatusChip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </GlassTable>
          </GlassCard>
        )}

        {bill.charges.length > 0 && (
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>{bill.kind === "goods" ? "Charges on this bill" : "Charges"}</CardTitle>
            {chargeRate !== undefined && (
              <p className="-mt-1 text-xs font-semibold text-muted">Freight and loading on a goods bill take the bill&rsquo;s rate: {chargeRate}%.</p>
            )}
            <ul className="flex flex-col gap-1.5 text-sm">
              {bill.charges.map((charge, index) => (
                <li key={index} className="glass-inset flex flex-wrap justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5">
                  <span>
                    <span className="font-semibold">{chargeName(charge.head)}</span>
                    {charge.description && <span className="font-semibold text-ink-soft"> · {charge.description}</span>}
                    <span className="block text-xs font-semibold text-muted">
                      GST {describeComponents(chargeRate ?? charge.gstRatePct ?? 0, tax.regime)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatInr(charge.amount)}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {bill.kind === "goods" && (
          <LandedCostCard
            goods={view}
            tagged={tagged}
            items={items}
            chargeName={chargeName}
            method={method}
            onMethodChange={changeMethod}
            savedRates={stored?.lines.map((line) => line.landedRate)}
            disabled={busy || bill.status !== "open"}
          />
        )}

        {bill.kind === "charges" && (
          <GlassCard className="flex flex-col gap-2">
            <CardTitle>Landed cost</CardTitle>
            {target ? (
              <p className="text-sm font-semibold text-ink-soft">
                {formatInr(totals.cost)} is spread over the items of{" "}
                <Link href={`/purchases/${target.id}`} className="font-semibold text-brand hover:underline">
                  {target.reference}
                </Link>{" "}
                ({parties.find((party) => party.id === target.vendorId)?.displayName}).
              </p>
            ) : (
              <p className="text-sm font-semibold text-warning-strong">
                Not tagged to a purchase, so it is booked as a general expense and no item carries it.
              </p>
            )}
          </GlassCard>
        )}
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Payment</CardTitle>
            <BillStatusChip status={status} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <FactTile label="Paid">{formatInr(bill.paid)}</FactTile>
            <FactTile label="Balance due">{formatInr(balance)}</FactTile>
          </dl>
          {payments.length > 0 && (
            <ul className="flex flex-col divide-y divide-line text-sm" aria-label="Payments on this bill">
              {payments.map((payment) => (
                <li key={payment.settlementId} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <Link href={`/payments/entries/${payment.settlementId}`} className="font-semibold text-brand hover:underline">
                      {payment.number}
                    </Link>
                    <span className="block text-xs text-muted">
                      {formatDate(payment.date)} · {modeText(payment.mode)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatInr(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {balance > 0 && bill.status === "open" ? (
            <Link href={`/payments/vendor-payments/new?bill=${bill.id}`} className={buttonClasses("success")}>
              <Wallet aria-hidden="true" className="size-[18px]" />
              Record payment
            </Link>
          ) : (
            <p className="text-xs font-semibold text-muted">{bill.status === "draft" ? "Save the bill as open before paying it." : "Nothing left to pay."}</p>
          )}
          <Link href={`/payments/ledger/${vendor.id}`} className="text-xs font-semibold text-brand hover:underline">
            {vendor.displayName}&rsquo;s ledger
          </Link>
        </GlassCard>

        <BillTotalsCard totals={totals} tax={tax} />

        {bill.kind === "goods" && (
          <GlassCard className="flex flex-col gap-2">
            <CardTitle>E-way bill</CardTitle>
            {bill.ewayBill ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <FactTile label="Number">{bill.ewayBill.number}</FactTile>
                <FactTile label="Date">{formatDate(bill.ewayBill.date)}</FactTile>
                {bill.ewayBill.vehicleNumber && <FactTile label="Vehicle">{bill.ewayBill.vehicleNumber}</FactTile>}
              </dl>
            ) : (
              <p className={ewayBillMissing(bill, totals.payable) ? "text-sm font-semibold text-warning-strong" : "text-sm font-semibold text-muted"}>
                {ewayBillMissing(bill, totals.payable)
                  ? vendor.gstin
                    ? "Above ₹50,000 and none recorded. The vendor should have generated one: ask for its number."
                    : "Above ₹50,000 and none recorded. The vendor has no GSTIN, so we generate it as the buyer."
                  : "None recorded. Not needed below ₹50,000."}
              </p>
            )}
          </GlassCard>
        )}

        <GlassCard className="flex flex-col gap-2">
          <CardTitle>Vendor&rsquo;s bill</CardTitle>
          {bill.fileName ? (
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Paperclip aria-hidden="true" className="size-4 text-muted" />
              {bill.fileName}
            </p>
          ) : (
            <p className="text-sm font-semibold text-muted">No scan attached.</p>
          )}
          {bill.notes && <p className="text-xs font-semibold text-ink-soft">{bill.notes}</p>}
          <p className="text-xs font-semibold text-muted">Uploading scans switches on when file storage is chosen.</p>
        </GlassCard>

        {bill.status === "open" && (
          <GlassCard className="flex flex-col gap-2">
            <CardTitle>Void this bill</CardTitle>
            <p className="text-xs font-semibold text-muted">
              {bill.kind === "goods"
                ? "Takes its stock back out. Not possible once any of it has been sold, or while freight or labour bills are added to it."
                : "Its cost comes off the purchase it was added to."}{" "}
              Bills are not edited: void and enter it again.
            </p>
            <Button variant="danger" disabled={busy} onClick={() => void act(() => voidBill(bill.id), `${bill.reference} is void.`)} className="self-start">
              <Ban aria-hidden="true" className="size-[18px]" />
              Void bill
            </Button>
          </GlassCard>
        )}
        {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
      </div>
    </div>
  );
}
