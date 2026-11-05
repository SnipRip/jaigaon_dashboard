"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDayMonth, formatInr, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { PurchaseOrderView } from "@/types/purchase";
import { OrderStatusChip, orderStage, type OrderStage } from "./order-status";

const FILTERS: (OrderStage | "All")[] = ["All", "To receive", "Partly received", "Received", "Closed", "Cancelled"];

// Every purchase order with what has come in against it.
export function OrdersWorkspace({ orders }: { orders: PurchaseOrderView[] }) {
  const today = useToday();
  const [filter, setFilter] = useState<OrderStage | "All">("All");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = orders.filter(
    (order) => (filter === "All" || orderStage(order) === filter) && (!needle || `${order.number} ${order.vendorName}`.toLowerCase().includes(needle)),
  );
  const open = orders.filter((order) => order.status === "OPEN" && order.receipt !== "RECEIVED");
  const pendingValue = open.reduce(
    (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.pending * line.rate * (1 - line.discountPct / 100), 0),
    0,
  );
  const late = open.filter((order) => today && order.expectedDate && order.expectedDate < today).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Orders" value={formatQuantity(orders.length)} />
        <StatTile label="Still to come" value={formatQuantity(open.length)} />
        <StatTile label="Value to come (before GST)" value={formatInr(pendingValue)} />
        <StatTile label="Past expected date" value={formatQuantity(late)} tone={late ? "danger" : undefined} />
      </div>
      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <Link href="/purchase-orders/new" className={buttonClasses("primary", undefined, "lg")}>
              <Plus aria-hidden="true" />
              New order
            </Link>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="order-search"
            label="Search orders"
            value={query}
            onChange={setQuery}
            placeholder="Search by number or vendor"
            trailing={`${visible.length} of ${orders.length}`}
          />
          <FilterGroup label="Show">
            {FILTERS.map((option) => (
              <FilterChip key={option} selected={filter === option} onClick={() => setFilter(option)}>
                {option === "All" ? "All" : option}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Order</th>
              <th scope="col" className="text-left">Vendor</th>
              <th scope="col" className="text-left">Items</th>
              <th scope="col">Total</th>
              <th scope="col" className="text-left">Status</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((order) => (
              <tr key={order.id} className="align-top">
                <td className="text-left">
                  <Link href={`/purchase-orders/${order.id}`} className="font-semibold hover:text-brand hover:underline">
                    {order.number}
                  </Link>
                  <div className="text-xs text-muted">
                    {formatDayMonth(order.date)}
                    {order.expectedDate && ` · expected ${formatDayMonth(order.expectedDate)}`}
                  </div>
                </td>
                <td className="text-left">
                  {order.vendorName}
                  <div className="text-xs text-muted">To {order.godownName}</div>
                </td>
                <td className="text-left text-xs">
                  {order.lines.slice(0, 2).map((line) => (
                    <div key={line.id}>
                      {line.itemName}: {formatQuantity(line.received)} of {formatQuantity(line.quantity)} {line.unit}
                    </div>
                  ))}
                  {order.lines.length > 2 && <div className="text-muted">+{order.lines.length - 2} more</div>}
                </td>
                <td>{formatInr(order.totals.total)}</td>
                <td className="text-left">
                  <OrderStatusChip order={order} today={today} />
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No orders match.</p>}
      </GlassCard>
    </div>
  );
}
