"use client";

import clsx from "clsx";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { FactTile } from "@/components/ui/fact-tile";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { BANK_CASH_PATH } from "@/features/masters/masters-api";
import { apiGet, saveErrorText } from "@/lib/api-client";
import { formatDate, formatInr, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { InstalmentView, LoanDetailView, LoanEntryKind } from "@/types/loan";
import { LoanEntryForm } from "./loan-entry-form";
import {
  cancelLoanEntry,
  DISBURSALS,
  entryLabel,
  frequencyLabel,
  INSTALMENT_STATUS,
  kindLabel,
  loanPath,
  rowLabel,
} from "./loans-api";
import { TallyVoucher } from "./tally-voucher";

type Notice = { tone: "success" | "error"; text: string };
interface Entering {
  kind: LoanEntryKind;
  instalment: InstalmentView | null;
}

/** The entry a schedule row's Record button opens. */
function entryFor(loan: LoanDetailView, row: InstalmentView): LoanEntryKind {
  if (row.kind === "EMI") return "EMI";
  if (row.kind === "INTEREST") return "INTEREST";
  // The repay-by row: its interest first when interest is due once at the end.
  const interestOpen = loan.interestFrequency === "AT_MATURITY" && loan.interestRatePct > 0 && row.entryId === null;
  return interestOpen ? "INTEREST" : "PRINCIPAL";
}

// One loan: where it stands, its schedule (record an entry from its row),
// the entries made with the Tally voucher each one makes, and its first entry.
export function LoanDetailScreen({ loanId }: { loanId: string }) {
  const { data: loan, error, mutate } = useSWR<LoanDetailView>(loanPath(loanId), apiGet);
  const { data: accounts } = useSWR<BankCashAccountView[]>(BANK_CASH_PATH, apiGet);
  const today = useToday();
  const [entering, setEntering] = useState<Entering | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  if (!loan || !accounts) return <LoadNotice error={error} what="the loan" />;

  const taken = loan.direction === "TAKEN";
  const open = loan.status === "ACTIVE" && !loan.isArchived;
  const nextUnsettled = loan.nextDue?.no;
  const saved = (updated: LoanDetailView, text: string) => {
    void mutate(updated, { revalidate: false });
    setEntering(null);
    setNotice({ tone: "success", text });
  };
  const cancel = async (entryId: string, voucherNumber: string) => {
    try {
      saved(await cancelLoanEntry(loan.id, entryId), `Entry ${voucherNumber} cancelled. Its number stays cancelled in the register.`);
    } catch (failure) {
      setNotice({ tone: "error", text: saveErrorText(failure) });
    }
  };
  const extraEntries: LoanEntryKind[] = loan.repayment === "EMI" ? ["PRINCIPAL", "INTEREST"] : ["PRINCIPAL", "INTEREST", "INTEREST_ADDED", "DRAWDOWN"];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/loans" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Loans
        </Link>
        <h2 className="text-lg font-semibold">{loan.name}</h2>
        <StatusChip tone={taken ? "neutral" : "brand"}>{taken ? "We owe" : "Owed to us"}</StatusChip>
        <StatusChip tone="neutral">{loan.tallyGroup}</StatusChip>
        {loan.status === "CLOSED" && <StatusChip tone="success">Settled</StatusChip>}
        {loan.isArchived && <StatusChip tone="neutral">Archived</StatusChip>}
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label={taken ? "We still owe" : "Still owed to us"} value={formatInr(loan.outstanding)} />
        <StatTile
          label={loan.repayment === "EMI" ? "EMI" : "Interest"}
          value={loan.repayment === "EMI" ? formatInr(loan.emiAmount ?? 0) : loan.interestRatePct > 0 ? `${loan.interestRatePct}% ${frequencyLabel(loan.interestFrequency).toLowerCase()}` : "Interest-free"}
        />
        <StatTile label={taken ? "Principal repaid here" : "Principal recovered here"} value={formatInr(loan.principalRepaid)} />
        <StatTile label={taken ? "Interest paid here" : "Interest earned here"} value={formatInr(loan.interestTotal)} />
      </div>

      <GlassCard className="flex flex-col gap-3">
        <CardTitle>Terms</CardTitle>
        <dl className="grid grid-cols-2 gap-2.5 text-[13px] md:grid-cols-4">
          <FactTile label={taken ? "Lender" : "Borrower"}>{loan.partyName}</FactTile>
          <FactTile label="Kind">{kindLabel(loan.direction, loan.kind)}</FactTile>
          <FactTile label="Loan account">{loan.loanAccountNumber ?? "–"}</FactTile>
          {taken && <FactTile label="Security">{loan.isSecured ? (loan.security ?? "Secured") : "Unsecured"}</FactTile>}
          <FactTile label="Amount">{formatRate(loan.principal)}</FactTile>
          <FactTile label={taken ? "Taken on" : "Given on"}>{formatDate(loan.disbursedOn)}</FactTile>
          {loan.repayment === "EMI" ? (
            <FactTile label="Rate · tenure · first EMI">
              {loan.interestRatePct}% · {loan.tenureMonths} months · {loan.firstEmiDate ? formatDate(loan.firstEmiDate) : "–"}
            </FactTile>
          ) : (
            <FactTile label="Interest · repay by">
              {loan.interestRatePct > 0 ? `${loan.interestRatePct}% ${frequencyLabel(loan.interestFrequency).toLowerCase()}` : "Interest-free"} ·{" "}
              {loan.maturityDate ? formatDate(loan.maturityDate) : "on demand"}
            </FactTile>
          )}
          <FactTile label="Goes through">{loan.repaymentAccountName}</FactTile>
          <FactTile label="How the money moved">{DISBURSALS.find((option) => option.value === loan.disbursal)?.label}</FactTile>
          <FactTile label="Interest ledger">
            {loan.interestLedger.ledger} · {loan.interestLedger.group}
          </FactTile>
          <FactTile label="TDS on interest">
            {loan.tdsRatePct ? `${loan.tdsRatePct}% · ${loan.tdsLedger.ledger}` : "None"}
          </FactTile>
          {loan.assetLedger && (
            <FactTile label="Asset bought">
              {loan.assetLedger.ledger} · {loan.assetLedger.group}
            </FactTile>
          )}
          <FactTile label="Reminder">{loan.reminderDays} days before</FactTile>
          {loan.notes && <FactTile label="Notes">{loan.notes}</FactTile>}
        </dl>
      </GlassCard>

      <div className="grid gap-3.5 xl:grid-cols-[3fr_2fr]">
        <GlassCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{loan.repayment === "EMI" ? "EMI schedule" : "Interest and repayment dates"}</CardTitle>
            {loan.overdueCount > 0 && <StatusChip tone="danger">{loan.overdueCount} overdue</StatusChip>}
          </div>
          {!loan.isArchived && (
            <div className="flex flex-wrap gap-2">
              {extraEntries.map((kind) => (
                <Button key={kind} variant="outline" onClick={() => setEntering({ kind, instalment: null })}>
                  <Plus aria-hidden="true" className="size-[18px]" />
                  {entryLabel(loan.direction, kind)}
                </Button>
              ))}
            </div>
          )}
          {loan.schedule.length === 0 ? (
            <p className="text-sm font-semibold text-muted">
              No dates to keep: an interest-free loan repayable on demand. Record repayments as they happen.
            </p>
          ) : (
            <GlassTable className="min-w-[660px]">
              <thead>
                <tr>
                  <th scope="col" className="text-left">Due</th>
                  <th scope="col" className="text-left">For</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col" className="text-right">Principal</th>
                  <th scope="col" className="text-right">Interest</th>
                  <th scope="col" className="text-right">Owed</th>
                  <th scope="col" className="text-left">Status</th>
                  <th scope="col"><span className="sr-only">Record</span></th>
                </tr>
              </thead>
              <tbody className="font-semibold tabular-nums">
                {loan.schedule.map((row) => {
                  const unsettled = row.status === "OVERDUE" || row.status === "DUE_SOON" || row.no === nextUnsettled;
                  const recordable = !loan.isArchived && (open || row.kind === "INTEREST") && unsettled;
                  return (
                    <tr key={row.no} className={clsx(row.status === "PAID_BEFORE_BOOKS" && "text-muted")}>
                      <td className="text-left whitespace-nowrap">{formatDate(row.dueDate)}</td>
                      <td className="text-left">{rowLabel(loan.direction, row)}</td>
                      <td className="text-right">{row.amount === null ? "–" : formatRate(row.amount)}</td>
                      <td className="text-right">{row.principal === null ? "–" : formatRate(row.principal)}</td>
                      <td className="text-right">{row.interest === null ? "–" : formatRate(row.interest)}</td>
                      <td className="text-right">{row.balance === null ? "–" : formatRate(row.balance)}</td>
                      <td className="text-left">
                        <StatusChip tone={INSTALMENT_STATUS[row.status].tone}>{INSTALMENT_STATUS[row.status].label}</StatusChip>
                      </td>
                      <td className="text-right">
                        {recordable && (
                          <Button variant={row.status === "OVERDUE" ? "primary" : "outline"} onClick={() => setEntering({ kind: entryFor(loan, row), instalment: row })}>
                            Record
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </GlassTable>
          )}
          <p className="text-xs font-semibold text-muted">
            {loan.repayment === "EMI"
              ? "Interest is worked out monthly on what is still owed. Recorded EMIs keep the split entered; a principal payment shortens the loan."
              : "Interest on each date is worked out on what was owed then. An interest entry settles its date; the last date is settled once nothing is owed."}
          </p>
        </GlassCard>

        <div className="flex flex-col gap-3.5">
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>Entries and Tally vouchers</CardTitle>
            {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}
            {loan.entries.length === 0 && <p className="text-sm font-semibold text-muted">No entry recorded yet.</p>}
            {[...loan.entries].reverse().map((entry) => (
              <div key={entry.id} className={clsx("flex flex-col gap-2", entry.cancelledAt && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                  {entryLabel(loan.direction, entry.kind)}
                  {entry.kind === "EMI" && ` ${entry.instalmentNo}`}
                  {entry.bankAccountName && <span className="text-xs font-medium text-muted">{entry.bankAccountName}</span>}
                  {entry.reference && <span className="text-xs font-medium text-muted">{entry.reference}</span>}
                  {entry.cancelledAt ? (
                    <StatusChip tone="neutral">Cancelled</StatusChip>
                  ) : (
                    <Button variant="neutral" className="ml-auto" onClick={() => void cancel(entry.id, entry.voucherNumber)}>
                      Cancel entry
                    </Button>
                  )}
                </div>
                <TallyVoucher voucher={entry.voucher} />
              </div>
            ))}
          </GlassCard>
          <GlassCard className="flex flex-col gap-3">
            <CardTitle>First entry</CardTitle>
            <TallyVoucher voucher={loan.firstEntry} />
          </GlassCard>
        </div>
      </div>

      <GlassModal
        open={entering !== null}
        onOpenChange={(isOpen) => !isOpen && setEntering(null)}
        title={entering?.instalment ? `${rowLabel(loan.direction, entering.instalment)} due ${formatDate(entering.instalment.dueDate)}` : entering ? entryLabel(loan.direction, entering.kind) : ""}
        description="Saved as its Tally voucher, numbered from the voucher's series."
      >
        {entering && today && (
          <LoanEntryForm
            key={`${entering.kind}-${entering.instalment?.no ?? "free"}`}
            loan={loan}
            kind={entering.kind}
            instalment={entering.instalment}
            accounts={accounts.map((account) => ({ value: account.id, label: account.name }))}
            today={today}
            onCancel={() => setEntering(null)}
            onSaved={saved}
          />
        )}
      </GlassModal>
    </div>
  );
}
