import clsx from "clsx";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { formatRate } from "@/lib/format";

export interface StatementItem {
  name: string;
  amount: number;
  /** Sub-groups and ledgers, shown smaller under the line. */
  details?: { name: string; amount: number }[];
  /** Carried figures (gross profit c/o, nett profit) stand out. */
  emphasis?: boolean;
}

interface Side {
  title: string;
  items: StatementItem[];
}

const sum = (items: StatementItem[]) => items.reduce((total, item) => total + item.amount, 0);

// Tally's horizontal statement: debits (or liabilities) on the left, credits
// (or assets) on the right, both sides totalled to the same figure.
export function TwoSidedStatement({ title, left, right }: { title?: string; left: Side; right: Side }) {
  const column = (side: Side) => (
    <div className="flex min-w-0 flex-col">
      <div className="flex justify-between border-b border-line pb-1.5 text-xs font-semibold text-muted">
        <span>{side.title}</span>
        <span>Amount</span>
      </div>
      <ul className="flex flex-1 flex-col">
        {side.items.map((item) => (
          <li key={item.name} className="border-b border-line/60 py-1.5">
            <div className={clsx("flex justify-between gap-3 text-[13px]", item.emphasis ? "font-semibold text-brand-strong" : "font-semibold")}>
              <span>{item.name}</span>
              <span className="tabular-nums">{formatRate(item.amount)}</span>
            </div>
            {item.details && item.details.length > 0 && (
              <ul className="mt-0.5 flex flex-col">
                {item.details.map((detail) => (
                  <li key={detail.name} className="flex justify-between gap-3 pl-3 text-xs text-muted">
                    <span>{detail.name}</span>
                    <span className="tabular-nums">{formatRate(detail.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t-2 border-line pt-1.5 text-[13px] font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatRate(sum(side.items))}</span>
      </div>
    </div>
  );

  return (
    <GlassCard className="flex flex-col gap-3">
      {title && <CardTitle>{title}</CardTitle>}
      <div className="grid gap-5 md:grid-cols-2">
        {column(left)}
        {column(right)}
      </div>
    </GlassCard>
  );
}
