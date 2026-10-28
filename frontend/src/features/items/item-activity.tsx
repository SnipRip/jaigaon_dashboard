import clsx from "clsx";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { formatDayMonth, formatInr, formatQuantity, formatRate } from "@/lib/format";
import { resolveItemDefaults, type ItemCatalog } from "./item-rules";
import { StockCell } from "./stock-cell";
import type { Item, StockMovement } from "./types";

// Read-only side of the item page: what is in stock, what it is worth, and
// the documents that moved it.
export function ItemActivity({ catalog, item, movements }: { catalog: ItemCatalog; item: Item; movements: StockMovement[] }) {
  const unit = resolveItemDefaults(catalog, item).unit.value ?? "";
  const lastSale = movements.findLast((movement) => movement.kind === "Sale");
  const lastPurchase = movements.findLast((movement) => movement.kind === "Purchase");

  return (
    <div className="flex flex-col gap-3.5">
      <GlassCard className="flex flex-col gap-3">
        <CardTitle>Stock</CardTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Figure label="In stock">
            <StockCell item={item} unit={unit} />
          </Figure>
          <Figure label="Stock value at cost">{formatInr(item.stock * item.costPrice)}</Figure>
          <Figure label="Last purchase rate">{lastPurchase ? formatRate(lastPurchase.rate) : "—"}</Figure>
          <Figure label="Last sale rate">{lastSale ? formatRate(lastSale.rate) : "—"}</Figure>
        </dl>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        <CardTitle>Stock movements</CardTitle>
        <GlassTable className="min-w-[420px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Date</th>
              <th scope="col" className="text-left">Document</th>
              <th scope="col">Quantity</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {movements.map((movement) => (
              <tr key={movement.reference}>
                <td className="text-left whitespace-nowrap">{formatDayMonth(movement.date)}</td>
                <td className="text-left">
                  <div className="font-semibold">
                    {movement.kind} · {movement.reference}
                  </div>
                  {movement.party && <div className="text-xs text-muted">{movement.party}</div>}
                </td>
                <td className={clsx(movement.quantity < 0 ? "text-danger-strong" : "text-success-strong")}>
                  {movement.quantity > 0 ? "+" : ""}
                  {formatQuantity(movement.quantity)} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      </GlassCard>
    </div>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-inset flex flex-col gap-1 rounded-(--radius-tile) p-3.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
