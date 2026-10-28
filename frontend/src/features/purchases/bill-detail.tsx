"use client";

import { Paperclip, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { describeComponents, treatmentLabel } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";
import { lineTotals } from "@/features/invoices/invoice-rules";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { BillStatusChip } from "./bill-status-chip";
import { BillTotalsCard } from "./bill-totals-card";
import { viewBill } from "./bill-view";
import { LandedCostCard } from "./landed-cost-card";
import { billChargeRate, chargeBillsFor, chargeHeadLabel, ewayBillMissing, isMsme, MSME_PAYMENT_DAYS } from "./purchase-rules";
import type { Bill } from "./types";

interface BillDetailProps {
  bill: Bill;
  bills: Bill[];
  parties: Party[];
  items: Item[];
  companyState: string;
}

// One vendor bill as entered from the vendor's paper: its lines and the
// GST on each, input credit, what is left to pay, the e-way bill it came
// with and, for goods, the landed cost of each item.
export function BillDetail({ bill, bills, parties, items, companyState }: BillDetailProps) {
  const today = useToday();
  const [method, setMethod] = useState(bill.allocation);
  const view = viewBill(bill, parties, companyState, today);
  const { vendor, tax, split, totals, status } = view;
  const balance = Math.max(totals.payable - bill.paid, 0);
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
            <FactTile label="Source of supply">{stateName(bill.sourceOfSupply) ?? "Outside India"}</FactTile>
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
                    <span className="font-semibold">{chargeHeadLabel(charge.head)}</span>
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
          <LandedCostCard goods={view} tagged={tagged} items={items} method={method} onMethodChange={setMethod} />
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
      </div>
    </div>
  );
}
