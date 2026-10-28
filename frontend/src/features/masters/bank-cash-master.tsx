"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatInr, formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { MoneyAccount } from "./types";

// Bank and cash books. A negative balance on a bank account is an overdraft
// (27 Oct 2026 walkthrough: bank is normally debit).
export function BankCashMaster({ accounts }: { accounts: MoneyAccount[] }) {
  const sum = (records: MoneyAccount[]) => records.reduce((total, account) => total + account.balance, 0);
  return (
    <RecordMaster
      noun={["account", "bank and cash accounts"]}
      initialRecords={accounts}
      nameKey="name"
      blank={{ kind: "bank", onInvoice: false, openingBalance: 0, balance: 0 }}
      fields={[
        { key: "name", label: "Account name", kind: "text", required: true, placeholder: "SBI current account" },
        {
          key: "kind",
          label: "Kind",
          kind: "select",
          required: true,
          options: [
            { value: "bank", label: "Bank account" },
            { value: "cash", label: "Cash book" },
          ],
        },
        { key: "bankName", label: "Bank", kind: "text" },
        { key: "branch", label: "Branch", kind: "text" },
        { key: "accountNumber", label: "Account number", kind: "text", pattern: /^\d{9,18}$/, message: "9 to 18 digits" },
        { key: "ifsc", label: "IFSC", kind: "text", upperCase: true, pattern: /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, message: "Like SBIN0001234" },
        { key: "openingBalance", label: "Opening balance on 1 April (₹)", kind: "number" },
        { key: "onInvoice", label: "Print on invoices for payment", kind: "toggle", onLabel: "Print", offLabel: "Do not print" },
      ]}
      columns={[
        { label: "Account", render: (account) => account.name },
        { label: "Bank", render: (account) => (account.kind === "cash" ? "Cash" : `${account.bankName ?? ""}${account.branch ? `, ${account.branch}` : ""}`) },
        { label: "Account no. · IFSC", render: (account) => (account.accountNumber ? `${account.accountNumber} · ${account.ifsc ?? ""}` : "–") },
        {
          label: "Balance",
          align: "right",
          render: (account) => (
            <span className={account.balance < 0 ? "text-danger-strong" : undefined}>
              {formatInr(account.balance)}
              {account.balance < 0 && <span className="block text-xs text-muted">overdraft</span>}
            </span>
          ),
        },
        { label: "Invoices", render: (account) => (account.onInvoice ? <StatusChip tone="brand">Printed</StatusChip> : null) },
      ]}
      searchText={(account) => `${account.name} ${account.bankName ?? ""} ${account.accountNumber ?? ""} ${account.ifsc ?? ""}`}
      filters={[
        { label: "Bank", test: (account) => account.kind === "bank" },
        { label: "Cash", test: (account) => account.kind === "cash" },
      ]}
      stats={(records) => [
        { label: "Accounts", value: formatQuantity(records.length) },
        { label: "In bank", value: formatInr(sum(records.filter((account) => account.kind === "bank" && account.balance > 0))) },
        { label: "Overdraft used", value: formatInr(-sum(records.filter((account) => account.balance < 0))), tone: "warning" },
        { label: "Cash in hand", value: formatInr(sum(records.filter((account) => account.kind === "cash"))) },
      ]}
      importColumns={["Account name", "Kind", "Bank", "Branch", "Account number", "IFSC", "Opening balance"]}
      footnote="Receipts and payments go through these accounts. Balances are sample figures until postings exist."
    />
  );
}
