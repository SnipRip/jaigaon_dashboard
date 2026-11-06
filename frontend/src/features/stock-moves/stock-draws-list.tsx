import { formatQuantity, formatRate } from "@/lib/format";
import type { StockDrawView } from "@/types/stock-moves";
import { DrawSourceLink } from "./draw-source-link";

/** The FIFO slices a line took: how much, from where, at what rate. */
export function StockDrawsList({ draws, unit, empty }: { draws: StockDrawView[]; unit: string; empty: string }) {
  if (!draws.length) return <span className="text-muted">{empty}</span>;
  return (
    <>
      {draws.map((draw, index) => (
        <div key={index}>
          {formatQuantity(draw.quantity)} {unit} · <DrawSourceLink source={draw.source} /> @ {formatRate(draw.rate)}
        </div>
      ))}
    </>
  );
}
