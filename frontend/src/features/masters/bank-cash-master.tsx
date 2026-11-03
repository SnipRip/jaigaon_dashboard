"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { financialYearOf } from "@/lib/financial-year";
import { formatDate, formatInr, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BankCashAccountView } from "@/types/bank-cash";
import { BANK_CASH_PATH, bankCashPersistence, toMoneyAccount, withArchived } from "./masters-api";
import { RecordMaster } from "./record-master";
import type { MoneyAccount } from "./types";

const KINDS = [
  { value: "bank", label: "Bank account" },
  { value: "overdraft", label: "Overdraft / cash credit" },
  { value: "cash", label: "Cash" },
];
const BANK_KINDS = { key: "kind", values: ["bank", "overdraft"] };

// Ledger names go to Tally as typed (same rule as the backend DTO).
const LEDGER_NAME = /^[A-Za-z0-9][A-Za-z0-9 &.,()/'-]{1,59}$/;
const LEDGER_NAME_MESSAGE = "2 to 60 letters, digits, spaces and & . , ( ) / ' -";

/** 1 April of the financial year a date falls in: the usual opening-balance date. */
const yearStart = (isoDate: string) => `${financialYearOf(isoDate).slice(0, 4)}-04-01`;

// Bank, overdraft and cash books: each becomes a Tally ledger. Balances are
// opening balances until receipts and payments are stored.
export function BankCashMaster() {
  const { data, error, mutate } = useSWR<BankCashAccountView[]>(withArchived(BANK_CASH_PATH), apiGet);
  const accounts = useMemo(() => data?.map(toMoneyAccount), [data]);
  const today = useToday();
  if (!accounts) return <LoadNotice error={error} what="bank and cash accounts" />;

  const sum = (records: MoneyAccount[]) => records.reduce((total, account) => total + account.openingBalance, 0);
  return (
    <RecordMaster
      noun={["account", "bank and cash accounts"]}
      initialRecords={accounts}
      persist={bankCashPersistence(() => void mutate())}
      nameKey="name"
      blank={{ kind: "bank", showOnInvoice: false, openingBalance: 0, openingDate: today ? yearStart(today) : undefined }}
      fields={[
        { key: "name", label: "Account name", kind: "text", required: true, placeholder: "SBI current account", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE },
        { key: "kind", label: "Kind", kind: "select", required: true, options: KINDS },
        { key: "bankName", label: "Bank", kind: "text", required: true, maxLength: 80, placeholder: "State Bank of India", showWhen: BANK_KINDS },
        { key: "branch", label: "Branch", kind: "text", maxLength: 80, showWhen: BANK_KINDS },
        { key: "accountNumber", label: "Account number", kind: "text", required: true, pattern: /^\d{9,18}$/, message: "9 to 18 digits", showWhen: BANK_KINDS },
        { key: "ifsc", label: "IFSC", kind: "text", required: true, upperCase: true, pattern: /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, message: "4 letters, 0, then 6 letters or digits, like SBIN0001234", showWhen: BANK_KINDS },
        { key: "upiId", label: "UPI ID", kind: "text", placeholder: "jaigaonquality@sbi", pattern: /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,63}$/, message: "Like jaigaonquality@sbi", showWhen: BANK_KINDS },
        { key: "openingBalance", label: "Opening balance (₹)", kind: "number", signed: true, hint: "Below zero only for an overdraft or cash credit: the amount drawn." },
        { key: "openingDate", label: "Balance as of", kind: "date", required: true },
        { key: "tallyLedgerName", label: "Tally ledger name", kind: "text", pattern: LEDGER_NAME, message: LEDGER_NAME_MESSAGE, hint: "Leave blank to use the account name. Must match the ledger in Tally." },
        { key: "showOnInvoice", label: "Bank details on invoices", kind: "toggle", onLabel: "Print", offLabel: "Do not print", hint: "Only one account prints. Choosing this one replaces the current one.", wide: true, showWhen: BANK_KINDS },
      ]}
      columns={[
        {
          label: "Account",
          render: (account) => (
            <span>
              {account.name}
              <span className="block text-xs font-medium text-muted">{account.tallyLedgerName ? `Tally: ${account.tallyLedgerName} · ` : ""}{account.tallyGroup}</span>
            </span>
          ),
        },
        { label: "Bank", render: (account) => (account.kind === "cash" ? "Cash" : `${account.bankName ?? ""}${account.branch ? `, ${account.branch}` : ""}`) },
        { label: "Account no. · IFSC", render: (account) => (account.accountNumber ? `${account.accountNumber} · ${account.ifsc ?? ""}` : "–") },
        {
          label: "Opening balance",
          align: "right",
          render: (account) => (
            <span className={account.openingBalance < 0 ? "text-danger-strong" : undefined}>
              {formatRate(account.openingBalance)}
              <span className="block text-xs font-medium text-muted">
                {account.openingBalance < 0 ? "overdraft · " : ""}on {formatDate(account.openingDate)}
              </span>
            </span>
          ),
        },
        { label: "Invoices", render: (account) => (account.showOnInvoice ? <StatusChip tone="brand">Printed</StatusChip> : null) },
      ]}
      searchText={(account) => `${account.name} ${account.bankName ?? ""} ${account.accountNumber ?? ""} ${account.ifsc ?? ""} ${account.tallyLedgerName ?? ""}`}
      filters={[
        { label: "Bank", test: (account) => account.kind === "bank" },
        { label: "Overdraft / CC", test: (account) => account.kind === "overdraft" },
        { label: "Cash", test: (account) => account.kind === "cash" },
      ]}
      stats={(records) => [
        { label: "Accounts", value: formatQuantity(records.length) },
        { label: "Opening in bank", value: formatInr(sum(records.filter((account) => account.kind === "bank"))) },
        { label: "Overdraft drawn", value: formatInr(Math.abs(sum(records.filter((account) => account.kind === "overdraft" && account.openingBalance < 0)))), tone: "warning" },
        { label: "Opening cash", value: formatInr(sum(records.filter((account) => account.kind === "cash"))) },
      ]}
      importMaster="bank-cash"
      footnote="Receipts and payments will go through these accounts. Each is a Tally ledger under the group shown; balances are opening balances until postings exist."
    />
  );
}
