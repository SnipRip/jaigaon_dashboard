"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import type { Party } from "@/features/parties/types";
import { formatDayMonth, formatInr, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { BillStatusChip } from "./bill-status-chip";
import { viewBill, type BillView } from "./bill-view";
import { chargeBillsFor, ewayBillMissing, isMsme } from "./purchase-rules";
import type { Bill } from "./types";

type BillFilter = "all" | "goods" | "charges" | "unpaid";

const FILTERS: { value: BillFilter; label: string }[] = [
  { value: "all", label: "All bills" },
  { value: "goods", label: "Goods" },
  { value: "charges", label: "Freight, loading & labour" },
  { value: "unpaid", label: "To pay" },
];

const isUnpaid = ({ status }: BillView) => status === "Open" || status === "Overdue" || status === "Partially paid";

interface PurchasesWorkspaceProps {
  bills: Bill[];
  parties: Party[];
  companyState: string;
}

// Every vendor bill, goods and charges, with the tax it carries, the input
// credit we get back, what is still to pay, and whether its freight and
// labour have been tagged on for landed cost.
export function PurchasesWorkspace({ bills, parties, companyState }: PurchasesWorkspaceProps) {
  const today = useToday();
  const [filter, setFilter] = useState<BillFilter>("all");
  const [query, setQuery] = useState("");

  const rows = bills.map((bill) => viewBill(bill, parties, companyState, today));
  const byId = new Map(rows.map((row) => [row.bill.id, row]));
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (filter === "all" || (filter === "unpaid" ? isUnpaid(row) : row.bill.kind === filter)) &&
      (!needle || `${row.bill.reference} ${row.bill.vendorBillNumber} ${row.vendor.displayName}`.toLowerCase().includes(needle)),
  );

  const live = rows.filter((row) => row.bill.status === "open");
  const toPay = live.reduce((sum, row) => sum + Math.max(row.totals.payable - row.bill.paid, 0), 0);
  const itc = live.reduce((sum, row) => sum + row.totals.itcClaimable, 0);
  const overdue = rows.filter((row) => row.status === "Overdue").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Bills" value={formatQuantity(rows.length)} />
        <StatTile label="To pay vendors" value={formatInr(toPay)} />
        <StatTile label="Input credit to claim" value={formatInr(itc)} tone="success" />
        <StatTile label="Overdue" value={formatQuantity(overdue)} tone={overdue > 0 ? "danger" : undefined} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Link href="/purchases/new" className={buttonClasses("primary")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New bill
          </Link>
          <Link href="/purchases/new?kind=charges" className={buttonClasses("outline")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            Freight, loading or labour bill
          </Link>
        </div>

        <SearchField
          id="bill-search"
          label="Search bills"
          value={query}
          onChange={setQuery}
          placeholder="Search by our reference, vendor's bill number or vendor"
          trailing={`${visible.length} of ${rows.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>

        <GlassTable className="min-w-[980px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Bill</th>
              <th scope="col" className="text-left">Vendor</th>
              <th scope="col" className="text-left">Tax</th>
              <th scope="col">Bill total</th>
              <th scope="col">Input credit</th>
              <th scope="col">Balance due</th>
              <th scope="col" className="text-left">Status</th>
              <th scope="col" className="text-left">Landed cost · e-way bill</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((row) => {
              const { bill, vendor, tax, totals, status } = row;
              const balance = Math.max(totals.payable - bill.paid, 0);
              return (
                <tr key={bill.id} className="align-top">
                  <td className="text-left">
                    <Link href={`/purchases/${bill.id}`} className="font-bold hover:text-brand hover:underline">
                      {bill.reference}
                    </Link>
                    <div className="text-xs text-muted">
                      {formatDayMonth(bill.date)} · {bill.vendorBillNumber}
                    </div>
                  </td>
                  <td className="text-left">
                    <div className="font-bold">{vendor.displayName}</div>
                    <div className="text-xs text-muted">
                      {bill.kind === "goods" ? "Goods" : "Freight, loading & labour"}
                      {isMsme(vendor) && " · MSME"}
                    </div>
                  </td>
                  <td className="text-left">
                    <StatusChip tone={tax.itc ? "brand" : "warning"}>{tax.title}</StatusChip>
                  </td>
                  <td className="font-bold">{formatInr(totals.payable)}</td>
                  <td className={totals.itcClaimable ? "text-success-strong" : "text-muted"}>
                    {totals.itcClaimable ? formatInr(totals.itcClaimable) : "None"}
                  </td>
                  <td>
                    {balance ? formatInr(balance) : "–"}
                    {balance > 0 && bill.status === "open" && <div className="text-xs text-muted">due {formatDayMonth(bill.dueDate)}</div>}
                  </td>
                  <td className="text-left">
                    <BillStatusChip status={status} />
                  </td>
                  <td className="text-left text-xs">
                    <LandedCostNote row={row} bills={bills} byId={byId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No bills match.</p>}
      </GlassCard>
    </div>
  );
}

function LandedCostNote({ row, bills, byId }: { row: BillView; bills: Bill[]; byId: Map<string, BillView> }) {
  const { bill, totals } = row;
  if (bill.kind === "charges") {
    const target = bill.landedCostFor ? byId.get(bill.landedCostFor) : undefined;
    return target ? (
      <span className="text-ink-soft">
        Added to{" "}
        <Link href={`/purchases/${target.bill.id}`} className="font-bold text-brand hover:underline">
          {target.bill.reference}
        </Link>
      </span>
    ) : (
      <span className="text-warning-strong">Not tagged to a purchase</span>
    );
  }
  const tagged = chargeBillsFor(bills, bill.id).length;
  const missing = ewayBillMissing(bill, totals.payable);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-ink-soft">
        {tagged ? `${tagged} charge bill${tagged > 1 ? "s" : ""} added` : totals.chargesValue ? "Charges on the bill" : "No charges"}
      </span>
      {bill.ewayBill ? (
        <span className="text-ink-soft">E-way bill {bill.ewayBill.number}</span>
      ) : missing ? (
        <span className="text-warning-strong">E-way bill not recorded</span>
      ) : null}
    </div>
  );
}
