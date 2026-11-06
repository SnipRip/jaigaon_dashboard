// Rules the sample-data screens (dashboard, reports) still use on the sample
// invoices and bills. The payments pages use the backend and
// settlements-api.ts. No React.
import type { Bill } from "@/features/purchases/types";
import { daysBetween } from "@/lib/dates";
import type { Settlement } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export const settledAgainst = (settlements: Settlement[], documentId: string) =>
  money(settlements.flatMap((settlement) => settlement.allocations).filter((allocation) => allocation.documentId === documentId).reduce((sum, allocation) => sum + allocation.amount, 0));

/**
 * Days left to pay an MSME vendor: 45 from the bill date at most (MSMED Act
 * s.15). Beyond it we owe interest at three times the bank rate, and the
 * unpaid amount is not deductible for income tax (s.43B(h)).
 */
export const msmeDaysLeft = (bill: Pick<Bill, "date">, today: string) => 45 - daysBetween(bill.date, today);
