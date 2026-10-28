import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { stockStatus } from "./item-rules";
import type { Item } from "./types";

/** Stock with its unit, flagged when at or below the reorder level. */
export function StockCell({ item, unit }: { item: Pick<Item, "stock" | "reorderLevel">; unit?: string }) {
  const label = `${formatQuantity(item.stock)} ${unit ?? ""}`.trim();
  const status = stockStatus(item);
  if (status === "out") return <StatusChip tone="danger">Out of stock</StatusChip>;
  if (status === "low") return <StatusChip tone="warning">Low · {label}</StatusChip>;
  return <>{label}</>;
}
