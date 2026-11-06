import { formatDate, formatRate } from "@/lib/format";
import type { VoucherView } from "@/types/loan";

// One voucher as it will go to Tally: ledger, its group, debit and credit.
/** Loan vouchers, and any other document's voucher in the same shape (an expense's Payment or Purchase). */
export function TallyVoucher({ voucher }: { voucher: Omit<VoucherView, "type"> & { type: string } }) {
  return (
    <div className="glass-inset flex flex-col gap-1.5 px-3 py-2.5 text-xs">
      <div className="font-semibold text-ink-soft">
        {voucher.type}
        {voucher.number && ` ${voucher.number}`} · {formatDate(voucher.date)}
      </div>
      <table className="w-full tabular-nums">
        <tbody>
          {voucher.lines.map((line) => (
            <tr key={`${line.ledger}-${line.debit}-${line.credit}`}>
              <td className="py-0.5 pr-2 font-semibold">{line.debit > 0 ? "Dr" : "Cr"}</td>
              <td className="py-0.5 pr-2">
                {line.ledger} <span className="text-muted">({line.group})</span>
              </td>
              <td className="py-0.5 text-right font-semibold">{formatRate(line.debit || line.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
