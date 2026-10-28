// A bill with everything screens show about it worked out once: its vendor,
// tax decision, totals and status. Shared by the list and the bill page.
import type { Party } from "@/features/parties/types";
import { billStatus, billTax, billTotals, splitRegime } from "./purchase-rules";
import type { Bill } from "./types";

export function viewBill(bill: Bill, parties: Party[], companyState: string, today: string | null) {
  const vendor = parties.find((candidate) => candidate.id === bill.vendorId)!;
  const tax = billTax(companyState, vendor, bill.sourceOfSupply);
  const split = splitRegime(tax, companyState, bill.sourceOfSupply ?? vendor.placeOfSupply);
  const totals = billTotals(bill, tax, split);
  return { bill, vendor, tax, split, totals, status: billStatus(bill, totals.payable, today) };
}

export type BillView = ReturnType<typeof viewBill>;
