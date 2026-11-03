"use client";

import { CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { BANK_CASH_PATH, withArchived } from "@/features/masters/masters-api";
import { RecordMaster } from "@/features/masters/record-master";
import { apiGet } from "@/lib/api-client";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { LoanView } from "@/types/loan";
import {
  DIRECTIONS,
  DISBURSALS,
  FREQUENCIES,
  frequencyLabel,
  GIVEN_KINDS,
  INSTALMENT_STATUS,
  kindLabel,
  LOANS_PATH,
  loanHref,
  loanPersistence,
  REPAYMENTS,
  rowLabel,
  TAKEN_KINDS,
  toLoanRecord,
  type LoanRecord,
} from "./loans-api";

// Ledger names go to Tally as typed (same rule as the backend).
const LEDGER_NAME = /^[A-Za-z0-9][A-Za-z0-9 &.,()/'-]{1,59}$/;
const LEDGER_NAME_MESSAGE = "2 to 60 letters, digits, spaces and & . , ( ) / ' -";
const when = (key: string, ...values: string[]) => ({ key, values });

// Every loan we owe and every loan or deposit owed to us: what is
// outstanding, what falls due next and whether it is late. The schedule and
// entries open on the loan's own page.
export function LoansMaster() {
  const router = useRouter();
  const { data, error, mutate } = useSWR<LoanView[]>(withArchived(LOANS_PATH), apiGet);
  const { data: accounts } = useSWR<BankCashAccountView[]>(BANK_CASH_PATH, apiGet);
  const loans = useMemo(() => data?.map(toLoanRecord), [data]);
  if (!loans || !accounts) return <LoadNotice error={error} what="loans" />;

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const bankOptions = accounts.filter((account) => account.kind !== "CASH").map((account) => ({ value: account.id, label: account.name }));
  const firstBank = accounts.find((account) => account.kind !== "CASH")?.id;
  const owed = (records: LoanRecord[], direction: "TAKEN" | "GIVEN") =>
    records.filter((loan) => loan.direction === direction).reduce((total, loan) => total + loan.view.outstanding, 0);

  return (
    <RecordMaster
      noun={["loan", "loans"]}
      initialRecords={loans}
      persist={loanPersistence(() => void mutate())}
      nameKey="name"
      blank={{
        direction: "TAKEN",
        takenKind: "VEHICLE",
        givenKind: "STAFF",
        repayment: "EMI",
        isSecured: true,
        // Fits both directions; "paid to the seller" is for loans we take only.
        disbursal: "THROUGH_BANK",
        disbursalAccountId: firstBank,
        interestFrequency: "MONTHLY",
        reminderDays: 3,
        repaymentAccountId: firstBank,
      }}
      fields={[
        { key: "name", label: "Loan name (Tally ledger)", kind: "text", required: true, placeholder: "HDFC Truck Loan WB73E1234", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE },
        { key: "direction", label: "Direction", kind: "select", required: true, options: DIRECTIONS },
        { key: "takenKind", label: "Kind", kind: "select", required: true, options: TAKEN_KINDS, showWhen: when("direction", "TAKEN") },
        { key: "givenKind", label: "Kind", kind: "select", required: true, options: GIVEN_KINDS, showWhen: when("direction", "GIVEN") },
        { key: "partyName", label: "Lender or borrower", kind: "text", required: true, maxLength: 80, placeholder: "HDFC Bank, a director, a staff member, the landlord" },
        { key: "loanAccountNumber", label: "Loan account number", kind: "text", upperCase: true, pattern: /^[A-Za-z0-9][A-Za-z0-9/-]{3,29}$/, message: "4 to 30 letters, digits, - or /" },
        { key: "isSecured", label: "Security", kind: "toggle", onLabel: "Secured", offLabel: "Unsecured", hint: "Secured: something is hypothecated, pledged or mortgaged (Secured Loans in Tally).", showWhen: when("direction", "TAKEN") },
        { key: "security", label: "What secures it", kind: "text", maxLength: 120, placeholder: "Truck WB73E1234 hypothecated", showWhen: when("isSecured", "true") },
        { key: "principal", label: "Amount (₹)", kind: "number", required: true },
        { key: "interestRatePct", label: "Interest rate (% a year)", kind: "number", required: true, hint: "0 for an interest-free loan or deposit." },
        { key: "disbursedOn", label: "Taken or given on", kind: "date", required: true },
        { key: "repayment", label: "Repayment", kind: "select", required: true, options: REPAYMENTS, wide: true },
        { key: "tenureMonths", label: "Tenure (months)", kind: "number", required: true, decimals: 0, showWhen: when("repayment", "EMI") },
        { key: "emiAmount", label: "EMI (₹)", kind: "number", hint: "As on the lender's schedule. Blank: worked out from the terms.", showWhen: when("repayment", "EMI") },
        { key: "firstEmiDate", label: "First EMI on", kind: "date", required: true, hint: "Later EMIs fall on the same day each month.", showWhen: when("repayment", "EMI") },
        { key: "interestFrequency", label: "Interest falls due", kind: "select", required: true, options: FREQUENCIES, showWhen: when("repayment", "FLEXIBLE") },
        { key: "firstInterestDate", label: "First interest date", kind: "date", hint: "Not needed when interest is once at the end or there is none.", showWhen: when("repayment", "FLEXIBLE") },
        { key: "maturityDate", label: "Repay by", kind: "date", hint: "Blank: repayable on demand.", showWhen: when("repayment", "FLEXIBLE") },
        { key: "disbursal", label: "How the money moved", kind: "select", required: true, options: DISBURSALS, wide: true },
        { key: "assetLedgerName", label: "Asset bought (Tally ledger)", kind: "text", required: true, placeholder: "Truck WB73E1234", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "Goes under Fixed Assets.", showWhen: when("disbursal", "PAID_TO_SELLER") },
        { key: "disbursalAccountId", label: "Bank account", kind: "select", required: true, options: bankOptions, showWhen: when("disbursal", "THROUGH_BANK") },
        { key: "paidBefore", label: "EMIs already paid", kind: "number", decimals: 0, hint: "EMI loans only, before these books start.", showWhen: when("disbursal", "BEFORE_BOOKS") },
        { key: "openingOutstanding", label: "Owed when these books start (₹)", kind: "number", required: true, hint: "Principal outstanding, from the statement.", showWhen: when("disbursal", "BEFORE_BOOKS") },
        { key: "repaymentAccountId", label: "Repayments go through", kind: "select", required: true, options: accountOptions },
        { key: "reminderDays", label: "Remind days before", kind: "number", decimals: 0, hint: "0 to 30." },
        { key: "tdsRatePct", label: "TDS on interest (%)", kind: "number", hint: "Non-bank lenders or borrowers, e.g. 10. Blank: none." },
        { key: "interestLedgerName", label: "Interest ledger in Tally", kind: "text", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "Blank: Interest on Loan (we owe) or Interest Received (owed to us)." },
        { key: "tdsLedgerName", label: "TDS ledger in Tally", kind: "text", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "Blank: TDS Payable on Interest, or TDS Receivable." },
        { key: "notes", label: "Notes", kind: "textarea", maxLength: 500 },
      ]}
      columns={[
        {
          label: "Loan",
          render: (loan) => (
            <span>
              {loan.name}
              <span className="block text-xs font-medium text-muted">
                {loan.partyName} · {loan.view.tallyGroup}
              </span>
            </span>
          ),
        },
        {
          label: "Kind",
          render: (loan) => (
            <span className="flex flex-col items-start gap-1">
              {kindLabel(loan.direction, loan.view.kind)}
              <StatusChip tone={loan.direction === "TAKEN" ? "neutral" : "brand"}>{loan.direction === "TAKEN" ? "We owe" : "Owed to us"}</StatusChip>
            </span>
          ),
        },
        {
          label: "Terms",
          align: "right",
          render: (loan) =>
            loan.repayment === "EMI" ? (
              <span>
                {formatRate(loan.emiAmount ?? 0)} EMI
                <span className="block text-xs font-medium text-muted">
                  {loan.interestRatePct}% · {loan.tenureMonths} months
                </span>
              </span>
            ) : (
              <span>
                {loan.interestRatePct > 0 ? `${loan.interestRatePct}%` : "Interest-free"}
                <span className="block text-xs font-medium text-muted">
                  {[loan.interestRatePct > 0 && frequencyLabel(loan.view.interestFrequency), loan.maturityDate ? `by ${formatDate(loan.maturityDate)}` : "on demand"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ),
        },
        { label: "Outstanding", align: "right", render: (loan) => formatRate(loan.view.outstanding) },
        {
          label: "Next due",
          render: (loan) => {
            const next = loan.view.nextDue;
            if (loan.view.status === "CLOSED" && !next) return <StatusChip tone="success">Settled</StatusChip>;
            if (!next) return "–";
            return (
              <span className="flex flex-col items-start gap-1">
                {rowLabel(loan.direction, next)} · {formatDate(next.dueDate)}
                {next.status !== "UPCOMING" && <StatusChip tone={INSTALMENT_STATUS[next.status].tone}>{INSTALMENT_STATUS[next.status].label}</StatusChip>}
              </span>
            );
          },
        },
      ]}
      searchText={(loan) => `${loan.name} ${loan.partyName} ${loan.loanAccountNumber ?? ""} ${loan.security ?? ""} ${loan.assetLedgerName ?? ""}`}
      filters={[
        { label: "We owe", test: (loan) => loan.direction === "TAKEN" && loan.view.status === "ACTIVE" },
        { label: "Owed to us", test: (loan) => loan.direction === "GIVEN" && loan.view.status === "ACTIVE" },
        { label: "Overdue", test: (loan) => loan.view.overdueCount > 0 },
        { label: "Settled", test: (loan) => loan.view.status === "CLOSED" },
      ]}
      stats={(records) => [
        { label: "We owe", value: formatInr(owed(records, "TAKEN")) },
        { label: "Owed to us", value: formatInr(owed(records, "GIVEN")) },
        { label: "Monthly EMIs we pay", value: formatInr(records.filter((loan) => loan.direction === "TAKEN" && loan.view.status === "ACTIVE").reduce((total, loan) => total + (loan.emiAmount ?? 0), 0)) },
        {
          label: "Overdue",
          value: formatQuantity(records.reduce((total, loan) => total + loan.view.overdueCount, 0)),
          tone: records.some((loan) => loan.view.overdueCount > 0) ? "danger" : undefined,
        },
      ]}
      rowActions={[{ label: (loan) => `Schedule and entries of ${loan.name}`, icon: <CalendarClock aria-hidden="true" className="size-4" />, onClick: (loan) => router.push(loanHref(loan.id)) }]}
      importColumns={["Loan name", "Direction", "Kind", "Lender or borrower", "Loan account number", "Amount", "Interest rate", "Repayment", "Tenure", "EMI", "First EMI on", "Repay by"]}
      footnote="Each loan is a Tally ledger: Secured or Unsecured Loans when we owe it, Loans & Advances or Deposits when it is owed to us. Every entry is a Payment, Receipt or Journal voucher."
    />
  );
}
