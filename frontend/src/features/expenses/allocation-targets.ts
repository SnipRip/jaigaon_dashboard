// What an expense can be allocated to, built from the sample invoices,
// shipments and goods bills. Becomes one backend query later.
import { invoices } from "@/features/invoices/sample-data";
import { moneyAccounts } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { bills } from "@/features/purchases/sample-data";
import { shipments } from "@/features/shipments/sample-data";
import type { AllocationTarget } from "./expense-form";

const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;

export const allocationTargets: AllocationTarget[] = [
  ...bills
    .filter((bill) => bill.kind === "goods" && bill.status !== "void")
    .map((bill) => ({ kind: "item-cost" as const, id: bill.id, label: `${bill.reference} · ${partyName(bill.vendorId)}` })),
  ...invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .map((invoice) => ({ kind: "invoice" as const, id: invoice.id, label: `${invoice.number} · ${partyName(invoice.partyId)}` })),
  ...shipments.map((shipment) => ({ kind: "shipment" as const, id: shipment.id, label: `${shipment.number} · ${shipment.vehicleNumber} to ${shipment.destination}` })),
];

/** Vendor and account id → display name. */
export const payeeAndAccountNames: Record<string, string> = Object.fromEntries([
  ...parties.map((party) => [party.id, party.displayName]),
  ...moneyAccounts.map((account) => [account.id, account.name]),
]);
