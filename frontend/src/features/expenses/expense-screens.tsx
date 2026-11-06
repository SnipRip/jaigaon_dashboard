"use client";

import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { INVOICES_PATH } from "@/features/invoices/invoices-api";
import { BANK_CASH_PATH, withArchived } from "@/features/masters/masters-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { PURCHASE_BILLS_PATH } from "@/features/purchases/purchases-api";
import { apiGet } from "@/lib/api-client";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { ExpenseView } from "@/types/expense";
import type { InvoiceView } from "@/types/invoice";
import type { PartyView } from "@/types/party";
import type { PurchaseBillView } from "@/types/purchase";
import { ExpenseDetail } from "./expense-detail";
import { ExpenseForm } from "./expense-form";
import { EXPENSES_PATH, expensePath } from "./expenses-api";
import { ExpensesWorkspace } from "./expenses-workspace";

// The expense pages' client screens, on the backend (/expenses).

export function ExpensesScreen() {
  const { data, error } = useSWR<ExpenseView[]>(EXPENSES_PATH, apiGet);
  if (!data) return <LoadNotice error={error} what="expenses" />;
  return <ExpensesWorkspace expenses={data} />;
}

export function NewExpenseScreen() {
  const expenses = useSWR<ExpenseView[]>(EXPENSES_PATH, apiGet);
  const vendors = useSWR<PartyView[]>(`${PARTIES_PATH}?role=vendor`, apiGet);
  const accounts = useSWR<BankCashAccountView[]>(withArchived(BANK_CASH_PATH), apiGet);
  const bills = useSWR<PurchaseBillView[]>(`${PURCHASE_BILLS_PATH}?kind=GOODS`, apiGet);
  const invoices = useSWR<InvoiceView[]>(INVOICES_PATH, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const error = vendors.error ?? accounts.error ?? bills.error ?? invoices.error ?? profileError;
  if (!vendors.data || !accounts.data || !bills.data || !invoices.data || !profile) return <LoadNotice error={error} what="the form" />;
  return (
    <ExpenseForm
      vendors={vendors.data.filter((party) => !party.isArchived).map(toParty)}
      accounts={accounts.data}
      bills={bills.data.filter((bill) => bill.status === "OPEN").map((bill) => ({ value: bill.id, label: `${bill.reference} · ${bill.vendorName} (${bill.vendorBillNumber})` }))}
      invoices={invoices.data.filter((invoice) => invoice.status === "ISSUED").map((invoice) => ({ value: invoice.id, label: `${invoice.number} · ${invoice.partyName}` }))}
      companyState={profile.stateCode ?? undefined}
      onSaved={async () => {
        await expenses.mutate();
      }}
    />
  );
}

export function ExpenseDetailScreen({ expenseId }: { expenseId: string }) {
  const { data, error, mutate } = useSWR<ExpenseView>(expensePath(expenseId), apiGet);
  if (!data) return <LoadNotice error={error} what="the expense" />;
  return (
    <ExpenseDetail
      expense={data}
      onChanged={async (next) => {
        await mutate(next, { revalidate: true });
      }}
    />
  );
}
