"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { formatDate, formatInr } from "@/lib/format";
import type { LedgerRow } from "./payment-rules";

interface LedgerSection {
  title: string;
  /** "Owes us" or "We owe". */
  balanceLabel: string;
  chargeLabel: string;
  settleLabel: string;
  opening: number;
  rows: LedgerRow[];
}

// A party's statement of account: opening balance, every invoice or bill,
// every receipt or payment, and the running balance. A party that is both
// customer and vendor gets one section for each.
export function PartyLedger({ partyName, sections }: { partyName: string; sections: LedgerSection[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={() => window.print()}>
          <Printer aria-hidden="true" className="size-[18px]" />
          Print statement
        </Button>
        <Link href="/payments" className={buttonClasses("neutral", "ml-auto")}>
          Back to payments
        </Link>
      </div>
      {sections.map((section) => {
        const closing = section.rows.at(-1)?.balance ?? section.opening;
        return (
          <GlassCard key={section.title} className="print-area flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <CardTitle>
                {partyName} · {section.title}
              </CardTitle>
              <span className="ml-auto text-sm font-semibold tabular-nums">
                {section.balanceLabel}: {formatInr(closing)}
              </span>
            </div>
            <GlassTable className="min-w-[680px]">
              <thead>
                <tr className="text-right">
                  <th scope="col" className="text-left">Date</th>
                  <th scope="col" className="text-left">Particulars</th>
                  <th scope="col">{section.chargeLabel}</th>
                  <th scope="col">{section.settleLabel}</th>
                  <th scope="col">Balance</th>
                </tr>
              </thead>
              <tbody className="text-right font-semibold tabular-nums">
                <tr>
                  <td className="text-left text-muted">1 Apr</td>
                  <td className="text-left font-semibold">Opening balance</td>
                  <td />
                  <td />
                  <td>{formatInr(section.opening)}</td>
                </tr>
                {section.rows.map((row, index) => (
                  <tr key={`${row.description}-${index}`}>
                    <td className="text-left whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="text-left">
                      {row.href ? (
                        <Link href={row.href} className="font-semibold hover:text-brand hover:underline">
                          {row.description}
                        </Link>
                      ) : (
                        row.description
                      )}
                    </td>
                    <td>{row.charge ? formatInr(row.charge) : ""}</td>
                    <td>{row.settle ? formatInr(row.settle) : ""}</td>
                    <td className="font-semibold">{formatInr(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </GlassTable>
            {section.rows.length === 0 && <p className="text-sm font-semibold text-muted">No documents this year.</p>}
          </GlassCard>
        );
      })}
    </div>
  );
}
