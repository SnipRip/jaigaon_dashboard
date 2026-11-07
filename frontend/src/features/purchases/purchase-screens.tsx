"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { toGodown } from "@/features/masters/masters-api";
import { apiGet } from "@/lib/api-client";
import type { PurchaseOrderView } from "@/types/purchase";
import { BillDetail } from "./bill-detail";
import { BillForm } from "./bill-form";
import { PurchasesWorkspace } from "./purchases-workspace";
import { PURCHASE_ORDERS_PATH } from "./purchases-api";
import { usePurchaseData } from "./use-purchase-data";

// Each vendor bill page's client screen: loads bills, vendors, our GST
// state and the item master from the backend, then hands them to the screen.

export function PurchasesListScreen() {
  const { data, error } = usePurchaseData();
  if (!data) return <LoadNotice error={error} what="vendor bills" />;
  return <PurchasesWorkspace bills={data.bills} parties={data.parties} company={data.company} />;
}

export function NewBillScreen({ kind, forBill, orderId }: { kind?: string; forBill?: string; orderId?: string }) {
  const { data, error, reload } = usePurchaseData();
  const order = useSWR<PurchaseOrderView>(orderId ? `${PURCHASE_ORDERS_PATH}/${orderId}` : null, apiGet);
  const purchases = useMemo(
    () =>
      data?.bills
        .filter((bill) => bill.kind === "goods" && bill.status === "open")
        .map((bill) => ({ id: bill.id, label: `${bill.reference} · ${bill.stored?.vendorName ?? ""} · ${bill.vendorBillNumber}` })) ?? [],
    [data],
  );
  if (!data || (orderId && !order.data)) return <LoadNotice error={error ?? order.error} what="the bill form" />;
  const initialFor = forBill && purchases.some((purchase) => purchase.id === forBill) ? forBill : undefined;
  return (
    <BillForm
      vendors={data.parties.filter((party) => !party.archived)}
      catalog={data.masters.catalog}
      purchases={purchases}
      godowns={data.masters.godowns.map(toGodown)}
      company={data.company}
      initialKind={kind === "charges" || initialFor ? "charges" : "goods"}
      initialFor={initialFor}
      order={order.data?.status === "OPEN" ? order.data : undefined}
      onSaved={reload}
    />
  );
}

export function BillScreen({ billId }: { billId: string }) {
  const { data, error, reload } = usePurchaseData();
  if (!data) return <LoadNotice error={error} what="the bill" />;
  const bill = data.bills.find((candidate) => candidate.id === billId);
  if (!bill) return <LoadNotice error={new Error("This bill does not exist.")} what="the bill" />;
  return (
    <BillDetail
      key={bill.id}
      bill={bill}
      bills={data.bills}
      parties={data.parties}
      items={data.masters.catalog.items}
      company={data.company}
      onChanged={reload}
    />
  );
}
