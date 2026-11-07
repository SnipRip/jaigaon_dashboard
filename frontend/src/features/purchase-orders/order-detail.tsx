"use client";

import { Ban, PackageCheck, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { cancelOrder, closeOrder } from "@/features/purchases/purchases-api";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { PurchaseOrderView } from "@/types/purchase";
import { OrderStatusChip } from "./order-status";

// One purchase order: what was asked for, what each goods bill brought in,
// and what is still to come. "Receive goods" opens a bill with the pending
// lines filled in.
export function OrderDetail({ order, onChanged }: { order: PurchaseOrderView; onChanged: () => Promise<void> }) {
  const today = useToday();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const open = order.status === "OPEN";
  const toCome = open && order.receipt !== "RECEIVED";

  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      await onChanged();
      setNotice({ tone: "success", text: done });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{order.number}</CardTitle>
            <OrderStatusChip order={order} today={today} />
            <Link href="/purchase-orders" className={buttonClasses("neutral", "ml-auto")}>
              Back to orders
            </Link>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FactTile label="Vendor">
              <Link href={`/vendors/${order.vendorId}`} className="font-semibold hover:text-brand hover:underline">
                {order.vendorName}
              </Link>
            </FactTile>
            <FactTile label="Ordered">{formatDate(order.date)}</FactTile>
            <FactTile label="Expected by">{order.expectedDate ? formatDate(order.expectedDate) : "Not set"}</FactTile>
            <FactTile label="Deliver to">{order.godownName}</FactTile>
          </dl>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Items</CardTitle>
          <GlassTable className="min-w-[700px]">
            <thead>
              <tr className="text-right">
                <th scope="col" className="text-left">Item</th>
                <th scope="col">Ordered</th>
                <th scope="col">Rate</th>
                <th scope="col">Received</th>
                <th scope="col">To come</th>
              </tr>
            </thead>
            <tbody className="text-right font-semibold tabular-nums">
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="text-left">
                    <Link href={`/items/${line.itemId}`} className="font-semibold hover:text-brand hover:underline">
                      {line.itemName}
                    </Link>
                    <div className="text-xs text-muted">
                      {[line.sku, `GST ${line.gstRatePct}%`].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td>
                    {formatQuantity(line.entered.quantity)} {line.entered.unit}
                    {line.entered.factor !== 1 && (
                      <div className="text-xs text-muted">
                        {formatQuantity(line.quantity)} {line.unit}
                      </div>
                    )}
                  </td>
                  <td>
                    {formatRate(line.entered.rate)}
                    {line.entered.factor !== 1 && <div className="text-xs text-muted">per {line.entered.unit}</div>}
                    {line.discountPct > 0 && <div className="text-xs text-muted">less {line.discountPct}%</div>}
                  </td>
                  {/* Bills may come in any unit, so what came and what is left are counted in the base unit. */}
                  <td className={line.received > 0 ? "text-success-strong" : "text-muted"}>
                    {formatQuantity(line.received)} {line.unit}
                  </td>
                  <td className={line.pending > 0 ? "text-warning-strong" : "text-muted"}>
                    {line.pending > 0 ? `${formatQuantity(line.pending)} ${line.unit}` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <CardTitle>Goods bills against this order</CardTitle>
          {order.bills.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">
              {order.bills.map((bill) => (
                <li key={bill.id} className="glass-inset flex justify-between gap-2 rounded-(--radius-tile) px-4 py-2.5 font-semibold">
                  <Link href={`/purchases/${bill.id}`} className="text-brand hover:underline">
                    {bill.reference}
                  </Link>
                  <span className="text-muted">{formatDate(bill.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-muted">Nothing received yet.</p>
          )}
        </GlassCard>
        {(order.terms || order.notes) && (
          <GlassCard className="flex flex-col gap-2">
            {order.terms && <p className="text-sm whitespace-pre-line text-ink-soft">{order.terms}</p>}
            {order.notes && <p className="text-xs font-semibold text-muted">Note: {order.notes}</p>}
          </GlassCard>
        )}
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <GlassCard className="flex flex-col gap-2">
          <CardTitle>Totals</CardTitle>
          <dl className="flex flex-col gap-1.5 text-sm font-semibold">
            <div className="flex justify-between">
              <dt>Value before GST</dt>
              <dd className="tabular-nums">{formatRate(order.totals.taxable)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>GST</dt>
              <dd className="tabular-nums">{formatRate(order.totals.tax)}</dd>
            </div>
            <div className="my-1 border-t border-line" />
            <div className="flex justify-between text-lg">
              <dt>Order total</dt>
              <dd className="tabular-nums">{formatInr(order.totals.total)}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2.5">
          <CardTitle>Next</CardTitle>
          {toCome && (
            <Link href={`/purchases/new?order=${order.id}`} className={buttonClasses("success", undefined, "lg")}>
              <PackageCheck aria-hidden="true" className="size-[18px]" />
              Receive goods
            </Link>
          )}
          {open && order.bills.length === 0 && (
            <Link href={`/purchase-orders/${order.id}/edit`} className={buttonClasses("neutral")}>
              <Pencil aria-hidden="true" className="size-[18px]" />
              Edit order
            </Link>
          )}
          {toCome && order.bills.length > 0 && (
            <Button variant="neutral" disabled={busy} onClick={() => void act(() => closeOrder(order.id), `${order.number} closed: nothing more is expected.`)}>
              <XCircle aria-hidden="true" className="size-[18px]" />
              Close: no more to come
            </Button>
          )}
          {open && order.bills.length === 0 && (
            <Button variant="danger" disabled={busy} onClick={() => void act(() => cancelOrder(order.id), `${order.number} cancelled.`)}>
              <Ban aria-hidden="true" className="size-[18px]" />
              Cancel order
            </Button>
          )}
          {!open && <p className="text-xs font-semibold text-muted">This order is {order.status.toLowerCase()}.</p>}
          {order.receipt === "RECEIVED" && open && <p className="text-xs font-semibold text-muted">Everything ordered has come in.</p>}
          {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
        </GlassCard>
      </div>
    </div>
  );
}
