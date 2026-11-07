"use client";

import { useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { INVOICES_PATH } from "@/features/invoices/invoices-api";
import { BANK_CASH_PATH, withArchived } from "@/features/masters/masters-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { PURCHASE_BILLS_PATH } from "@/features/purchases/purchases-api";
import { SHIPMENTS_PATH } from "@/features/shipments/shipments-api";
import { apiGet } from "@/lib/api-client";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { ExpenseView } from "@/types/expense";
import type { InvoiceView } from "@/types/invoice";
import type { PartyView } from "@/types/party";
import type { PurchaseBillView } from "@/types/purchase";
import type { ShipmentView } from "@/types/shipment";
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
  const shipmentId = useSearchParams().get("shipment") ?? undefined;
  const expenses = useSWR<ExpenseView[]>(EXPENSES_PATH, apiGet);
  const vendors = useSWR<PartyView[]>(`${PARTIES_PATH}?role=vendor`, apiGet);
  const accounts = useSWR<BankCashAccountView[]>(withArchived(BANK_CASH_PATH), apiGet);
  const bills = useSWR<PurchaseBillView[]>(`${PURCHASE_BILLS_PATH}?kind=GOODS`, apiGet);
  const invoices = useSWR<InvoiceView[]>(INVOICES_PATH, apiGet);
  const shipments = useSWR<ShipmentView[]>(SHIPMENTS_PATH, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const error = vendors.error ?? accounts.error ?? bills.error ?? invoices.error ?? shipments.error ?? profileError;
  if (!vendors.data || !accounts.data || !bills.data || !invoices.data || !shipments.data || !profile) return <LoadNotice error={error} what="the form" />;
  return (
    <ExpenseForm
      vendors={vendors.data.filter((party) => !party.isArchived).map(toParty)}
      accounts={accounts.data}
      bills={bills.data.filter((bill) => bill.status === "OPEN").map((bill) => ({ value: bill.id, label: `${bill.reference} · ${bill.vendorName} (${bill.vendorBillNumber})` }))}
      invoices={invoices.data.filter((invoice) => invoice.status === "ISSUED").map((invoice) => ({ value: invoice.id, label: `${invoice.number} · ${invoice.partyName}` }))}
      shipments={shipments.data
        .filter((shipment) => !shipment.cancelledAt)
        .map((shipment) => ({ value: shipment.id, label: `${shipment.number} · ${shipment.partyName} · ${shipment.vehicleNumber}` }))}
      initialShipmentId={shipments.data.some((shipment) => shipment.id === shipmentId && !shipment.cancelledAt) ? shipmentId : undefined}
      company={profile}
      onSaved={async (saved) => {
        await expenses.mutate();
        if (saved.target?.kind === "SHIPMENT") await mutate(`${SHIPMENTS_PATH}/${saved.target.id}`);
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
