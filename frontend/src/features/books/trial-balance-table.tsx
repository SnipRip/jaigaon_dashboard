"use client";

import clsx from "clsx";
import Link from "next/link";
import { Fragment } from "react";
import { GlassTable } from "@/components/ui/glass-table";
import type { GroupBalanceView, TrialBalanceView } from "@/types/ledger";
import { drCr, figure, SOURCE_LABELS, sourceHref } from "./books-api";

interface TrialBalanceTableProps {
  trial: TrialBalanceView;
  /** Show every ledger under its group (the chart of accounts), or groups only. */
  ledgers: boolean;
  /** Chart of accounts: opening and closing with the owning master; trial balance: closing Dr / Cr. */
  mode: "chart" | "trial";
}

const closingDr = (amount: number) => figure(Math.max(amount, 0));
const closingCr = (amount: number) => figure(Math.max(-amount, 0));

// Tally's Trial Balance, group-wise with sub-groups indented. With ledgers
// shown it doubles as the chart of accounts: every ledger from every master
// under its group, with the master it lives in.
export function TrialBalanceTable({ trial, ledgers, mode }: TrialBalanceTableProps) {
  const rows = (group: GroupBalanceView, depth: number): React.ReactNode => (
    <Fragment key={group.id}>
      <tr className={clsx(depth === 0 && "font-semibold")}>
        <td style={{ paddingLeft: `${depth * 18 + 12}px` }}>{group.name}</td>
        {mode === "chart" ? (
          <>
            <td className="text-muted">{depth === 0 ? "Group" : "Sub-group"}</td>
            <td className="text-right tabular-nums">{drCr(group.opening)}</td>
            <td className="text-right tabular-nums">{drCr(group.closing)}</td>
          </>
        ) : (
          <>
            <td className="text-right tabular-nums">{drCr(group.opening)}</td>
            <td className="text-right tabular-nums">{figure(group.debit)}</td>
            <td className="text-right tabular-nums">{figure(group.credit)}</td>
            <td className="text-right tabular-nums">{closingDr(group.closing)}</td>
            <td className="text-right tabular-nums">{closingCr(group.closing)}</td>
          </>
        )}
      </tr>
      {group.groups.map((child) => rows(child, depth + 1))}
      {ledgers &&
        group.ledgers.map((ledger) => {
          const href = sourceHref(ledger, group.name);
          return (
            <tr key={`${group.id}:${ledger.name}`} className="text-ink-soft">
              <td style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }}>
                {href ? (
                  <Link href={href} className="hover:text-brand hover:underline">
                    {ledger.name}
                  </Link>
                ) : (
                  ledger.name
                )}
              </td>
              {mode === "chart" ? (
                <>
                  <td className={clsx(ledger.source === "unlisted" ? "font-semibold text-danger-strong" : "text-muted")}>{SOURCE_LABELS[ledger.source]}</td>
                  <td className="text-right tabular-nums">{drCr(ledger.opening)}</td>
                  <td className="text-right tabular-nums">{drCr(ledger.closing)}</td>
                </>
              ) : (
                <>
                  <td className="text-right tabular-nums">{drCr(ledger.opening)}</td>
                  <td className="text-right tabular-nums">{figure(ledger.debit)}</td>
                  <td className="text-right tabular-nums">{figure(ledger.credit)}</td>
                  <td className="text-right tabular-nums">{closingDr(ledger.closing)}</td>
                  <td className="text-right tabular-nums">{closingCr(ledger.closing)}</td>
                </>
              )}
            </tr>
          );
        })}
    </Fragment>
  );

  const pl = trial.profitAndLoss;
  const difference = -trial.differenceInOpening;
  return (
    <GlassTable className="min-w-[720px]">
      <thead>
        <tr>
          <th className="text-left">Particulars</th>
          {mode === "chart" ? (
            <>
              <th className="text-left">Kept in</th>
              <th className="text-right">Opening</th>
              <th className="text-right">Closing</th>
            </>
          ) : (
            <>
              <th className="text-right">Opening</th>
              <th className="text-right">Debit</th>
              <th className="text-right">Credit</th>
              <th className="text-right">Closing Dr</th>
              <th className="text-right">Closing Cr</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {trial.groups.map((group) => rows(group, 0))}
        {pl && (
          <tr className="font-semibold">
            <td className="pl-3">{pl.name}</td>
            {mode === "chart" ? (
              <>
                <td className="font-normal text-muted">Primary</td>
                <td className="text-right tabular-nums">{drCr(pl.opening)}</td>
                <td className="text-right tabular-nums">{drCr(pl.closing)}</td>
              </>
            ) : (
              <>
                <td className="text-right tabular-nums">{drCr(pl.opening)}</td>
                <td className="text-right tabular-nums">{figure(pl.debit)}</td>
                <td className="text-right tabular-nums">{figure(pl.credit)}</td>
                <td className="text-right tabular-nums">{closingDr(pl.closing)}</td>
                <td className="text-right tabular-nums">{closingCr(pl.closing)}</td>
              </>
            )}
          </tr>
        )}
        {difference !== 0 && (
          <tr className="font-semibold text-danger-strong">
            <td className="pl-3">Difference in opening balances</td>
            {mode === "chart" ? (
              <>
                <td />
                <td className="text-right tabular-nums">{drCr(difference)}</td>
                <td className="text-right tabular-nums">{drCr(difference)}</td>
              </>
            ) : (
              <>
                <td className="text-right tabular-nums">{drCr(difference)}</td>
                <td />
                <td />
                <td className="text-right tabular-nums">{closingDr(difference)}</td>
                <td className="text-right tabular-nums">{closingCr(difference)}</td>
              </>
            )}
          </tr>
        )}
      </tbody>
      {mode === "trial" && (
        <tfoot>
          <tr className="font-semibold">
            <td className="pl-3">Grand total</td>
            <td />
            <td />
            <td />
            <td className="text-right tabular-nums">{figure(trial.totalDebit)}</td>
            <td className="text-right tabular-nums">{figure(trial.totalCredit)}</td>
          </tr>
        </tfoot>
      )}
    </GlassTable>
  );
}
